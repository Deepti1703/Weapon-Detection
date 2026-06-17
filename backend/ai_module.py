"""
Ensemble CNN inference: ResNet50 + EfficientNet-B0 + MobileNetV2 + DenseNet121.
Dual heads for weapon and wound classification with Grad-CAM explainability.
"""

import base64
import io
import json
import os
import time

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from forensic_taxonomy import (
    CONFIDENCE_THRESHOLD,
    CANDIDATE_CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_MESSAGE,
    METRICS_PATH,
    MODEL_WEIGHTS_PATH,
    WEAPON_CLASSES,
    WOUND_CLASSES,
    WOUND_TO_SEVERITY,
    WOUND_TO_WEAPONS,
)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class EnsembleModel(nn.Module):
    """Multi-backbone feature fusion with separate weapon/wound heads using soft voting."""

    def __init__(
        self,
        num_weapon_classes=len(WEAPON_CLASSES),
        num_wound_classes=len(WOUND_CLASSES),
    ):
        super().__init__()
        try:
            from torchvision.models import (
                DenseNet121_Weights,
                EfficientNet_B0_Weights,
                MobileNet_V2_Weights,
                ResNet50_Weights,
            )
            self.resnet = models.resnet50(weights=ResNet50_Weights.DEFAULT)
            self.efficientnet = models.efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
            self.mobilenet = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
            self.densenet = models.densenet121(weights=DenseNet121_Weights.DEFAULT)
        except ImportError:
            self.resnet = models.resnet50(pretrained=True)
            self.efficientnet = models.efficientnet_b0(pretrained=True)
            self.mobilenet = models.mobilenet_v2(pretrained=True)
            self.densenet = models.densenet121(pretrained=True)

        self.resnet_features = nn.Sequential(*list(self.resnet.children())[:-2])
        self.resnet_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.densenet_features = self.densenet.features
        self.densenet_pool = nn.AdaptiveAvgPool2d((1, 1))

        # Individual classification heads for soft voting ensemble
        self.resnet_weapon = nn.Linear(2048, num_weapon_classes)
        self.resnet_wound = nn.Linear(2048, num_wound_classes)

        self.efficientnet_weapon = nn.Linear(1280, num_weapon_classes)
        self.efficientnet_wound = nn.Linear(1280, num_wound_classes)

        self.mobilenet_weapon = nn.Linear(1280, num_weapon_classes)
        self.mobilenet_wound = nn.Linear(1280, num_wound_classes)

        self.densenet_weapon = nn.Linear(1024, num_weapon_classes)
        self.densenet_wound = nn.Linear(1024, num_wound_classes)

        self.gradients = None
        self.activations = None

    def activations_hook(self, grad):
        self.gradients = grad

    def forward(self, x):
        # Extract features for all backbones
        # Hook ResNet activations for Grad-CAM compatibility
        x_res = self.resnet_features(x)
        if x_res.requires_grad:
            h = x_res.register_hook(self.activations_hook)
            self._hook_handle = h
        self.activations = x_res
        res_feat = self.resnet_pool(x_res).view(x.size(0), -1)

        eff_feat = self.efficientnet.avgpool(self.efficientnet.features(x)).view(x.size(0), -1)
        mob_feat = nn.functional.adaptive_avg_pool2d(self.mobilenet.features(x), (1, 1)).view(x.size(0), -1)
        den_feat = self.densenet_pool(self.densenet_features(x)).view(x.size(0), -1)

        # Get logits from individual models
        res_w = self.resnet_weapon(res_feat)
        res_d = self.resnet_wound(res_feat)

        eff_w = self.efficientnet_weapon(eff_feat)
        eff_d = self.efficientnet_wound(eff_feat)

        mob_w = self.mobilenet_weapon(mob_feat)
        mob_d = self.mobilenet_wound(mob_feat)

        den_w = self.densenet_weapon(den_feat)
        den_d = self.densenet_wound(den_feat)

        # Soft voting combining outputs
        weapon_probs = (torch.softmax(res_w, dim=1) + 
                        torch.softmax(eff_w, dim=1) + 
                        torch.softmax(mob_w, dim=1) + 
                        torch.softmax(den_w, dim=1)) / 4.0

        wound_probs = (torch.softmax(res_d, dim=1) + 
                       torch.softmax(eff_d, dim=1) + 
                       torch.softmax(mob_d, dim=1) + 
                       torch.softmax(den_d, dim=1)) / 4.0

        weapon_logits = torch.log(weapon_probs + 1e-8)
        wound_logits = torch.log(wound_probs + 1e-8)

        return weapon_logits, wound_logits


def _load_model_weights(model: EnsembleModel) -> str:
    if os.path.isfile(MODEL_WEIGHTS_PATH):
        try:
            state = torch.load(MODEL_WEIGHTS_PATH, map_location=device)
            model.load_state_dict(state, strict=False)
            return "v3.0-ensemble-trained"
        except Exception as e:
            print(f"Weight load failed ({e}); using pretrained backbones only.")
    return "v3.0-ensemble-pretrained-heads"


model = EnsembleModel().to(device)
MODEL_VERSION = _load_model_weights(model)
model.eval()


def preprocess_image_cv2(image_bytes: bytes) -> Image.Image:
    np_img = np.frombuffer(image_bytes, np.uint8)
    img_cv = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    if img_cv is None:
        raise ValueError("Invalid image bytes")
    img_cv = cv2.fastNlMeansDenoisingColored(img_cv, None, 10, 10, 7, 21)
    lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img_cv = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))


def generate_gradcam(original_img: Image.Image, target_class_idx: int):
    try:
        if model.gradients is None or model.activations is None:
            return None
        gradients = model.gradients[0].cpu().data.numpy()
        activations = model.activations[0].cpu().data.numpy()
        weights = np.mean(gradients, axis=(1, 2))
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
        cam = np.maximum(cam, 0)
        if cam.max() > 0:
            cam = cam / cam.max()
        cam = cv2.resize(cam, (original_img.width, original_img.height))
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        org_cv = cv2.cvtColor(np.array(original_img), cv2.COLOR_RGB2BGR)
        overlay = cv2.addWeighted(org_cv, 0.55, heatmap, 0.45, 0)
        _, buffer = cv2.imencode(".jpg", overlay)
        return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
    except Exception as e:
        print(f"Grad-CAM failed: {e}")
        return None


def _top_k_alternatives(probs: torch.Tensor, labels: list, key: str, k: int = 3):
    k = min(k, len(labels))
    top = torch.topk(probs, k)
    results = []
    for idx, conf in zip(top.indices, top.values):
        c_val = round(conf.item(), 4)
        if c_val >= CANDIDATE_CONFIDENCE_THRESHOLD:
            results.append({key: labels[idx.item()], "confidence": c_val})
    return results


def _forensic_context(wound: str, weapon: str) -> dict:
    severity = WOUND_TO_SEVERITY.get(wound, "Moderate")
    probable_weapons = WOUND_TO_WEAPONS.get(wound, [])
    precautions = [
        "Preserve wound perimeter for trace evidence collection.",
        "Document imaging angles before any cleaning or treatment.",
    ]
    if wound == "Gunshot":
        precautions.append("Collect firearm residue and trajectory markers.")
    if wound in ("Stab", "Puncture", "Chop"):
        precautions.append("Preserve tool-mark patterns for casting analysis.")
    notes = [
        f"Model associates wound pattern '{wound}' with implement class '{weapon}'.",
        f"Forensic prior weapons for this wound type: {', '.join(probable_weapons[:3])}.",
    ]
    return {
        "severity": severity,
        "precautions": precautions,
        "forensic_notes": notes,
        "probable_weapons_from_wound": probable_weapons,
    }


def predict_image(image_bytes: bytes) -> dict:
    start_time = time.time()
    threshold = CONFIDENCE_THRESHOLD

    try:
        image = preprocess_image_cv2(image_bytes)
        input_tensor = transform(image).unsqueeze(0).to(device)

        model.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(True):
            model.eval()
            input_tensor.requires_grad_(True)
            weapon_out, wound_out = model(input_tensor)

        weapon_probs = torch.nn.functional.softmax(weapon_out, dim=1)[0]
        wound_probs = torch.nn.functional.softmax(wound_out, dim=1)[0]

        weapon_conf, weapon_idx = torch.max(weapon_probs, 0)
        wound_conf, wound_idx = torch.max(wound_probs, 0)

        w_conf_val = round(weapon_conf.item(), 4)
        wd_conf_val = round(wound_conf.item(), 4)

        weapon_pred = WEAPON_CLASSES[weapon_idx.item()]
        wound_pred = WOUND_CLASSES[wound_idx.item()]

        is_low_confidence = w_conf_val < threshold or wd_conf_val < threshold
        display_weapon = weapon_pred
        display_wound = wound_pred

        weapon_out[0, weapon_idx].backward(retain_graph=True)
        heatmap_b64 = generate_gradcam(image, weapon_idx.item())

        context = _forensic_context(wound_pred, weapon_pred)
        inference_time = round((time.time() - start_time) * 1000, 2)

        metrics_snapshot = {}
        if os.path.isfile(METRICS_PATH):
            try:
                with open(METRICS_PATH, encoding="utf-8") as f:
                    metrics_snapshot = json.load(f)
            except Exception:
                pass

        return {
            "weapon": display_weapon,
            "weapon_probability": w_conf_val,
            "wound_type": display_wound,
            "wound_probability": wd_conf_val,
            "raw_weapon": weapon_pred,
            "raw_wound_type": wound_pred,
            "top_3_weapon_alternatives": _top_k_alternatives(weapon_probs, WEAPON_CLASSES, "weapon"),
            "top_3_wound_alternatives": _top_k_alternatives(wound_probs, WOUND_CLASSES, "wound_type"),
            "is_rejected": is_low_confidence,
            "requires_manual_review": is_low_confidence,
            "low_confidence_message": None,
            "confidence_threshold": threshold,
            "gradcam_heatmap": heatmap_b64,
            "model_version": MODEL_VERSION,
            "preprocessing_applied": {
                "denoising": True,
                "clahe": True,
                "normalization": True,
                "resize": "224x224",
                "alignment": "landmark-ready",
            },
            "inference_time_ms": inference_time,
            "severity": context["severity"],
            "precautions": context["precautions"],
            "forensic_notes": context["forensic_notes"],
            "probable_weapons_from_wound": context["probable_weapons_from_wound"],
            "training_metrics": metrics_snapshot,
        }
    except Exception as e:
        print(f"Prediction error: {e}")
        return {
            "weapon": "Unknown",
            "weapon_probability": 0.0,
            "wound_type": "Unknown",
            "wound_probability": 0.0,
            "top_3_weapon_alternatives": [],
            "top_3_wound_alternatives": [],
            "is_rejected": True,
            "requires_manual_review": True,
            "gradcam_heatmap": None,
            "model_version": f"{MODEL_VERSION}-error",
            "preprocessing_applied": {},
            "inference_time_ms": 0,
            "severity": "Unknown",
            "precautions": [],
            "forensic_notes": [str(e)],
        }
