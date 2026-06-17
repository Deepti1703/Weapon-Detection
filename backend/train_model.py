"""
Train ensemble forensic model with dual labels, augmentation, metrics, and checkpoint export.
Usage:
  python train_model.py --dataset dataset --epochs 30 --batch_size 16
"""

import argparse
import copy
import json
import os
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from torch.utils.data import DataLoader, Subset
from torchvision import transforms
from tqdm import tqdm

from ai_module import EnsembleModel, device, preprocess_image_cv2
from dataset_pipeline import DualLabelForensicDataset, ensure_dataset_structure, import_from_uploads, write_labels_template
from forensic_taxonomy import METRICS_PATH, MODEL_WEIGHTS_PATH, WEAPON_CLASSES, WOUND_CLASSES

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(BACKEND_DIR, "dataset")


def collate_dual(batch):
    imgs, weapon_labels, wound_labels, _meta = zip(*batch)
    return torch.stack(imgs), torch.tensor(weapon_labels), torch.tensor(wound_labels)


def build_loaders(dataset_path: str, batch_size: int):
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.2, hue=0.08),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    full = DualLabelForensicDataset(dataset_path, transform=train_tf)
    if len(full) < 3:
        return None, None, None, full

    n = len(full)
    train_n = max(1, int(0.7 * n))
    val_n = max(1, int(0.15 * n))
    test_n = n - train_n - val_n
    if test_n < 1:
        test_n = 1
        val_n = max(1, n - train_n - test_n)

    gen = torch.Generator().manual_seed(42)
    train_ds, val_ds, test_ds = torch.utils.data.random_split(
        full, [train_n, val_n, test_n], generator=gen
    )

    # Eval transforms on val/test
    val_copy = copy.deepcopy(full)
    val_copy.transform = eval_tf
    test_copy = copy.deepcopy(full)
    test_copy.transform = eval_tf
    val_ds.dataset = val_copy
    test_ds.dataset = test_copy

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0, collate_fn=collate_dual)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=collate_dual)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0, collate_fn=collate_dual)
    return train_loader, val_loader, test_loader, full


def run_epoch(model, loader, criterion_w, criterion_d, optimizer=None) -> Tuple[float, Dict]:
    is_train = optimizer is not None
    model.train() if is_train else model.eval()

    total_loss = 0.0
    weapon_preds, weapon_true = [], []
    wound_preds, wound_true = [], []
    n_samples = 0

    ctx = torch.enable_grad() if is_train else torch.no_grad()
    with ctx:
        for inputs, w_labels, d_labels in loader:
            inputs = inputs.to(device)
            w_labels = w_labels.to(device)
            d_labels = d_labels.to(device)

            if is_train:
                optimizer.zero_grad()

            w_out, d_out = model(inputs)
            loss_w = criterion_w(w_out, w_labels)
            loss_d = criterion_d(d_out, d_labels)
            loss = loss_w + loss_d

            if is_train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * inputs.size(0)
            n_samples += inputs.size(0)

            wp = torch.argmax(w_out, dim=1).cpu().numpy()
            dp = torch.argmax(d_out, dim=1).cpu().numpy()
            weapon_preds.extend(wp)
            weapon_true.extend(w_labels.cpu().numpy())
            wound_preds.extend(dp)
            wound_true.extend(d_labels.cpu().numpy())

    metrics = {
        "weapon_accuracy": accuracy_score(weapon_true, weapon_preds) if weapon_true else 0,
        "wound_accuracy": accuracy_score(wound_true, wound_preds) if wound_true else 0,
        "weapon_precision": precision_score(weapon_true, weapon_preds, average="weighted", zero_division=0),
        "weapon_recall": recall_score(weapon_true, weapon_preds, average="weighted", zero_division=0),
        "weapon_f1": f1_score(weapon_true, weapon_preds, average="weighted", zero_division=0),
        "wound_precision": precision_score(wound_true, wound_preds, average="weighted", zero_division=0),
        "wound_recall": recall_score(wound_true, wound_preds, average="weighted", zero_division=0),
        "wound_f1": f1_score(wound_true, wound_preds, average="weighted", zero_division=0),
        "weapon_confusion": confusion_matrix(weapon_true, weapon_preds).tolist() if weapon_true else [],
        "wound_confusion": confusion_matrix(wound_true, wound_preds).tolist() if wound_true else [],
    }
    avg_loss = total_loss / max(n_samples, 1)
    return avg_loss, metrics


def train_model(
    data_dir: str = DEFAULT_DATASET,
    epochs: int = 30,
    batch_size: int = 16,
    lr: float = 1e-4,
):
    ensure_dataset_structure(data_dir)
    imported = import_from_uploads(os.path.join(BACKEND_DIR, "uploads", "images"), data_dir)
    labels_csv = os.path.join(data_dir, "labels.csv")
    if not os.path.isfile(labels_csv):
        n = write_labels_template(labels_csv, os.path.join(data_dir, "images"))
        print(f"Created labels template with {n} rows at {labels_csv}")

    loaders = build_loaders(data_dir, batch_size)
    if loaders[0] is None:
        print("Not enough labeled images. Add data under dataset/images + labels.csv")
        return

    train_loader, val_loader, test_loader, full_ds = loaders
    print(f"Dataset size: {len(full_ds)} | train={len(train_loader.dataset)} val={len(val_loader.dataset)} test={len(test_loader.dataset)}")

    model = EnsembleModel().to(device)
    criterion_w = nn.CrossEntropyLoss()
    criterion_d = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=4)

    best_score = 0.0
    best_wts = copy.deepcopy(model.state_dict())
    patience = 8
    no_improve = 0
    history: List[dict] = []

    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")
        train_loss, train_m = run_epoch(model, train_loader, criterion_w, criterion_d, optimizer)
        val_loss, val_m = run_epoch(model, val_loader, criterion_w, criterion_d)
        combined_f1 = (val_m["weapon_f1"] + val_m["wound_f1"]) / 2
        scheduler.step(combined_f1)

        row = {
            "epoch": epoch + 1,
            "train_loss": train_loss,
            "val_loss": val_loss,
            **{f"val_{k}": v for k, v in val_m.items() if k != "weapon_confusion" and k != "wound_confusion"},
        }
        history.append(row)
        print(
            f"train_loss={train_loss:.4f} val_loss={val_loss:.4f} "
            f"weapon_f1={val_m['weapon_f1']:.4f} wound_f1={val_m['wound_f1']:.4f}"
        )

        if combined_f1 > best_score:
            best_score = combined_f1
            best_wts = copy.deepcopy(model.state_dict())
            torch.save(best_wts, MODEL_WEIGHTS_PATH)
            no_improve = 0
            print(f"Saved checkpoint -> {MODEL_WEIGHTS_PATH}")
        else:
            no_improve += 1
            if no_improve >= patience:
                print("Early stopping.")
                break

    model.load_state_dict(best_wts)
    test_loss, test_m = run_epoch(model, test_loader, criterion_w, criterion_d)

    report = {
        "model_architecture": "ResNet50+EfficientNetB0+MobileNetV2+DenseNet121",
        "weapon_classes": WEAPON_CLASSES,
        "wound_classes": WOUND_CLASSES,
        "best_val_combined_f1": best_score,
        "test_metrics": test_m,
        "training_history": history,
        "note": "Forensic models cannot guarantee 100% accuracy; use expert review for low-confidence cases.",
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n=== Test metrics ===")
    print(json.dumps({k: v for k, v in test_m.items() if "confusion" not in k}, indent=2))
    print(f"Metrics saved to {METRICS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Forensic ensemble trainer")
    parser.add_argument("--dataset", type=str, default=DEFAULT_DATASET)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()
    train_model(args.dataset, args.epochs, args.batch_size, args.lr)
