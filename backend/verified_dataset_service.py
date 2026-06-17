"""
Automatic dataset collection from analyst-verified forensic cases.
"""

import csv
import os
import re
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from forensic_taxonomy import WOUND_CLASSES, WEAPON_CLASSES

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(BACKEND_DIR, "dataset")
LABELS_CSV = "labels.csv"

AUTO_RETRAIN_THRESHOLD = int(os.getenv("FORENSIC_AUTO_RETRAIN_THRESHOLD", "50"))


def _slug(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (name or "unknown").strip().lower()).strip("_")
    return s or "unknown"


def ensure_class_folders(dataset_root: str) -> None:
    wounds_dir = os.path.join(dataset_root, "wounds")
    weapons_dir = os.path.join(dataset_root, "weapons")
    os.makedirs(wounds_dir, exist_ok=True)
    os.makedirs(weapons_dir, exist_ok=True)
    for w in WOUND_CLASSES:
        os.makedirs(os.path.join(wounds_dir, _slug(w)), exist_ok=True)
    for w in WEAPON_CLASSES:
        os.makedirs(os.path.join(weapons_dir, _slug(w)), exist_ok=True)


def _unique_dest(folder: str, basename: str) -> str:
    dst = os.path.join(folder, basename)
    if not os.path.exists(dst):
        return dst
    stem, ext = os.path.splitext(basename)
    n = 1
    while True:
        candidate = os.path.join(folder, f"{stem}_{n}{ext}")
        if not os.path.exists(candidate):
            return candidate
        n += 1


def copy_to_dataset_folders(
    source_path: str,
    weapon_label: str,
    wound_label: str,
    dataset_root: str = DEFAULT_DATASET,
) -> Tuple[str, str]:
    """Copy image into wound/ and weapon/ class folders."""
    if not source_path or not os.path.isfile(source_path):
        raise FileNotFoundError(f"Source image not found: {source_path}")

    ensure_class_folders(dataset_root)
    basename = os.path.basename(source_path)
    wound_folder = os.path.join(dataset_root, "wounds", _slug(wound_label))
    weapon_folder = os.path.join(dataset_root, "weapons", _slug(weapon_label))
    os.makedirs(wound_folder, exist_ok=True)
    os.makedirs(weapon_folder, exist_ok=True)

    wound_dst = _unique_dest(wound_folder, basename)
    weapon_dst = _unique_dest(weapon_folder, basename)
    shutil.copy2(source_path, wound_dst)
    shutil.copy2(source_path, weapon_dst)
    return weapon_dst, wound_dst


def append_labels_csv(
    image_rel_path: str,
    wound_type: str,
    weapon_type: str,
    severity: str = "Moderate",
    split: str = "train",
    dataset_root: str = DEFAULT_DATASET,
) -> None:
    csv_path = os.path.join(dataset_root, LABELS_CSV)
    images_dir = os.path.join(dataset_root, "images")
    os.makedirs(images_dir, exist_ok=True)

    fieldnames = [
        "image_path", "wound_type", "weapon_type",
        "severity", "anatomical_location", "split",
    ]
    rows: List[dict] = []
    if os.path.isfile(csv_path):
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

    key = image_rel_path.replace("\\", "/")
    rows = [r for r in rows if r.get("image_path", "").replace("\\", "/") != key]
    rows.append({
        "image_path": key,
        "wound_type": wound_type,
        "weapon_type": weapon_type,
        "severity": severity,
        "anatomical_location": "Unknown",
        "split": split,
    })

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def sync_image_to_labels_index(
    source_path: str,
    wound_label: str,
    weapon_label: str,
    dataset_root: str = DEFAULT_DATASET,
) -> str:
    """Copy into dataset/images and register in labels.csv."""
    images_dir = os.path.join(dataset_root, "images")
    os.makedirs(images_dir, exist_ok=True)
    rel_name = os.path.basename(source_path)
    dst = _unique_dest(images_dir, rel_name)
    shutil.copy2(source_path, dst)
    rel_path = os.path.join("images", os.path.basename(dst)).replace("\\", "/")
    append_labels_csv(rel_path, wound_label, weapon_label, dataset_root=dataset_root)
    return dst


def register_verified_sample(
    db: Session,
    *,
    prediction_id: Optional[int],
    image_path: str,
    predicted_weapon: str,
    predicted_wound: str,
    weapon_label: str,
    wound_label: str,
    confidence_score: float,
    verified_by_id: int,
    is_corrected: bool = False,
    remarks: Optional[str] = None,
    gradcam_path: Optional[str] = None,
    confidence_distribution: Optional[dict] = None,
) -> "VerifiedTrainingData":
    from models import VerifiedTrainingData, DatasetSample, User

    dataset_root = DEFAULT_DATASET
    weapon_dst, wound_dst = copy_to_dataset_folders(
        image_path, weapon_label, wound_label, dataset_root
    )
    indexed_path = sync_image_to_labels_index(
        image_path, wound_label, weapon_label, dataset_root
    )

    row = VerifiedTrainingData(
        prediction_id=prediction_id,
        image_path=image_path,
        predicted_weapon=predicted_weapon,
        predicted_wound=predicted_wound,
        confidence_score=confidence_score,
        verified_weapon=weapon_label,
        verified_wound=wound_label,
        is_corrected=is_corrected,
        remarks=remarks,
        verified_by=verified_by_id,
        verified_at=datetime.utcnow(),
        training_status="pending",
        dataset_weapon_path=weapon_dst,
        dataset_wound_path=wound_dst,
        gradcam_path=gradcam_path,
        attention_map_path=gradcam_path,
        confidence_distribution=confidence_distribution,
    )
    db.add(row)

    # Resolve analyst name for DatasetSample
    user_row = db.query(User).filter(User.id == verified_by_id).first()
    analyst_name = user_row.name or user_row.username if user_row else str(verified_by_id)

    sample = DatasetSample(
        image_path=image_path,
        weapon_class=weapon_label,
        wound_type=wound_label,
        verified_by=analyst_name,
        verified_date=datetime.utcnow(),
        status="pending"
    )
    db.add(sample)

    return row


def count_pending(db: Session) -> int:
    from models import DatasetSample
    return db.query(DatasetSample).filter(
        DatasetSample.status == "pending"
    ).count()


def list_verified_samples(db: Session, limit: int = 200) -> List[dict]:
    from models import VerifiedTrainingData, User

    rows = (
        db.query(VerifiedTrainingData, User.username)
        .outerjoin(User, VerifiedTrainingData.verified_by == User.id)
        .order_by(VerifiedTrainingData.verified_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for v, username in rows:
        out.append({
            "id": v.id,
            "image_path": v.image_path,
            "weapon_label": v.verified_weapon,
            "wound_label": v.verified_wound,
            "verified_by": username or str(v.verified_by),
            "verified_at": v.verified_at.isoformat() if v.verified_at else None,
            "training_status": v.training_status,
            "is_corrected": v.is_corrected,
            "confidence_score": v.confidence_score,
        })
    return out


def mark_samples_trained(db: Session, sample_ids: Optional[List[int]] = None) -> int:
    from models import VerifiedTrainingData, DatasetSample

    q = db.query(VerifiedTrainingData).filter(
        VerifiedTrainingData.training_status.in_(["pending", "queued"])
    )
    q_ds = db.query(DatasetSample).filter(
        DatasetSample.status.in_(["pending", "queued"])
    )
    if sample_ids:
        # Match image paths to sync dataset_samples
        images = [r.image_path for r in db.query(VerifiedTrainingData).filter(VerifiedTrainingData.id.in_(sample_ids)).all()]
        q = q.filter(VerifiedTrainingData.id.in_(sample_ids))
        q_ds = q_ds.filter(DatasetSample.image_path.in_(images))
    
    count = q.update({"training_status": "trained"}, synchronize_session=False)
    q_ds.update({"status": "trained"}, synchronize_session=False)
    db.commit()
    return count


def get_dataset_stats(db: Session) -> Dict:
    from models import DatasetSample

    total = db.query(DatasetSample).count()
    pending = db.query(DatasetSample).filter(
        DatasetSample.status == "pending"
    ).count()
    trained = db.query(DatasetSample).filter(
        DatasetSample.status == "trained"
    ).count()

    dataset_root = DEFAULT_DATASET
    folder_counts = {}
    wounds_dir = os.path.join(dataset_root, "wounds")
    if os.path.isdir(wounds_dir):
        for name in os.listdir(wounds_dir):
            p = os.path.join(wounds_dir, name)
            if os.path.isdir(p):
                folder_counts[name] = len([
                    f for f in os.listdir(p)
                    if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
                ])

    return {
        "total_verified_cases": total,
        "pending_training_samples": pending,
        "trained_samples": trained,
        "auto_retrain_threshold": AUTO_RETRAIN_THRESHOLD,
        "wound_folder_counts": folder_counts,
        "dataset_root": dataset_root,
    }
