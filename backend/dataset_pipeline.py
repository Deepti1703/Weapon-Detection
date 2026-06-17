"""
Dataset loading, preprocessing metadata, and folder layout helpers.
Expected training layout (dual-label CSV optional):

dataset/
  images/
    <filename>.jpg
  labels.csv   # image_path,wound_type,weapon_type,severity,anatomical_location,split

Or class-folder layout (weapon label from folder, wound from subfolder or CSV):
dataset/weapons/<weapon_class>/<files>
"""

import csv
import os
import random
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import Image
from torch.utils.data import Dataset

from ai_module import preprocess_image_cv2
from forensic_taxonomy import WOUND_CLASSES, WEAPON_CLASSES


def ensure_dataset_structure(base_dir: str) -> Dict[str, str]:
    """Create standard dataset directories."""
    paths = {
        "root": base_dir,
        "images": os.path.join(base_dir, "images"),
        "train": os.path.join(base_dir, "splits", "train"),
        "val": os.path.join(base_dir, "splits", "val"),
        "test": os.path.join(base_dir, "splits", "test"),
        "metadata": os.path.join(base_dir, "metadata"),
    }
    for p in paths.values():
        os.makedirs(p, exist_ok=True)
    return paths


def import_from_uploads(uploads_dir: str, output_dir: str) -> int:
    """Bootstrap dataset from existing backend/uploads/images."""
    ensure_dataset_structure(output_dir)
    images_out = os.path.join(output_dir, "images")
    os.makedirs(images_out, exist_ok=True)
    count = 0
    if not os.path.isdir(uploads_dir):
        return 0
    for fname in os.listdir(uploads_dir):
        if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            src = os.path.join(uploads_dir, fname)
            dst = os.path.join(images_out, fname)
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
            count += 1
    return count


def write_labels_template(csv_path: str, image_dir: str) -> int:
    """Create labels.csv template for images without labels."""
    rows = []
    if not os.path.isdir(image_dir):
        return 0
    for fname in os.listdir(image_dir):
        if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            wound = "Stab" if "stab" in fname.lower() else "Laceration"
            weapon = "Gun" if "gun" in fname.lower() else "Knife"
            rows.append({
                "image_path": os.path.join("images", fname),
                "wound_type": wound,
                "weapon_type": weapon,
                "severity": "Moderate",
                "anatomical_location": "Unknown",
                "split": "train",
            })
    if not rows:
        return 0
    fieldnames = list(rows[0].keys())
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


class DualLabelForensicDataset(Dataset):
    """Dataset with wound + weapon labels from CSV or inferred from folder names."""

    def __init__(self, root_dir: str, transform=None, split: Optional[str] = None):
        self.root_dir = root_dir
        self.transform = transform
        self.samples: List[Tuple[str, int, int, dict]] = []
        csv_path = os.path.join(root_dir, "labels.csv")
        wound_to_idx = {c: i for i, c in enumerate(WOUND_CLASSES)}
        weapon_to_idx = {c: i for i, c in enumerate(WEAPON_CLASSES)}

        if os.path.isfile(csv_path):
            with open(csv_path, newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    if split and row.get("split") != split:
                        continue
                    img_path = row["image_path"]
                    if not os.path.isabs(img_path):
                        img_path = os.path.join(root_dir, img_path)
                    if not os.path.isfile(img_path):
                        continue
                    w = row.get("wound_type", "Stab")
                    wep = row.get("weapon_type", "Knife")
                    if w not in wound_to_idx or wep not in weapon_to_idx:
                        continue
                    meta = {
                        "severity": row.get("severity", "Moderate"),
                        "anatomical_location": row.get("anatomical_location", "Unknown"),
                    }
                    self.samples.append((img_path, wound_to_idx[w], weapon_to_idx[wep], meta))
        else:
            # Fallback: dataset/weapons/<class>/...
            weapons_root = os.path.join(root_dir, "weapons")
            if os.path.isdir(weapons_root):
                for weapon_name in os.listdir(weapons_root):
                    if weapon_name not in weapon_to_idx:
                        continue
                    cls_dir = os.path.join(weapons_root, weapon_name)
                    if not os.path.isdir(cls_dir):
                        continue
                    for fname in os.listdir(cls_dir):
                        if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                            path = os.path.join(cls_dir, fname)
                            # Infer wound from filename heuristics
                            lower = fname.lower()
                            if "gun" in lower:
                                w_idx = wound_to_idx.get("Gunshot", 5)
                            elif "lacer" in lower:
                                w_idx = wound_to_idx.get("Laceration", 2)
                            elif "abras" in lower:
                                w_idx = wound_to_idx.get("Abrasion", 3)
                            else:
                                w_idx = wound_to_idx.get("Stab", 0)
                            self.samples.append((path, w_idx, weapon_to_idx[weapon_name], {}))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, wound_idx, weapon_idx, meta = self.samples[idx]
        try:
            with open(img_path, "rb") as f:
                img = preprocess_image_cv2(f.read())
        except Exception:
            img = Image.new("RGB", (224, 224), (128, 128, 128))
        if self.transform:
            img = self.transform(img)
        return img, weapon_idx, wound_idx, meta

def split_dataset_indices(n: int, seed: int = 42) -> Tuple[List[int], List[int], List[int]]:
    idx = list(range(n))
    random.seed(seed)
    random.shuffle(idx)
    train_n = int(0.7 * n)
    val_n = int(0.15 * n)
    train_idx = idx[:train_n]
    val_idx = idx[train_n : train_n + val_n]
    test_idx = idx[train_n + val_n :]
    return train_idx, val_idx, test_idx
