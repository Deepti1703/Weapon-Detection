"""
Forensic wound–weapon taxonomy, mappings, and inference thresholds.
"""

import os

# Wound types (14 categories per user specification)
WOUND_CLASSES = [
    "Knife Wound",
    "Dagger Wound",
    "Scalpel Wound",
    "Hammer Injury",
    "Blunt Object Injury",
    "Screwdriver Injury",
    "Axe Injury",
    "Glass Injury",
    "Gunshot Wound",
    "Puncture Wound",
    "Incised Wound",
    "Laceration",
    "Abrasion",
    "Contusion",
]

# Weapon / implement categories
WEAPON_CLASSES = [
    "Knife",
    "Dagger",
    "Scalpel",
    "Hammer",
    "Blunt Object",
    "Screwdriver",
    "Axe",
    "Glass",
    "Gun",
    "Ice Pick",
    "Machete",
    "Other",
]

SEVERITY_LEVELS = ["Low", "Moderate", "High", "Critical", "Severe"]

ANATOMICAL_LOCATIONS = [
    "Head/Neck",
    "Torso",
    "Upper Extremity",
    "Lower Extremity",
    "Hand",
    "Back",
    "Unknown",
]

# Wound type -> probable weapons (forensic priors for UI hints)
WOUND_TO_WEAPONS = {
    "Knife Wound": ["Knife", "Other"],
    "Dagger Wound": ["Dagger", "Knife"],
    "Scalpel Wound": ["Scalpel", "Knife"],
    "Hammer Injury": ["Hammer", "Blunt Object"],
    "Blunt Object Injury": ["Blunt Object", "Hammer"],
    "Screwdriver Injury": ["Screwdriver"],
    "Axe Injury": ["Axe", "Machete"],
    "Glass Injury": ["Glass", "Other"],
    "Gunshot Wound": ["Gun"],
    "Puncture Wound": ["Ice Pick", "Screwdriver", "Knife"],
    "Incised Wound": ["Knife", "Scalpel", "Other"],
    "Laceration": ["Blunt Object", "Hammer", "Other"],
    "Abrasion": ["Blunt Object", "Other"],
    "Contusion": ["Blunt Object", "Hammer"],
}

# Wound type -> typical severity
WOUND_TO_SEVERITY = {
    "Knife Wound": "High",
    "Dagger Wound": "Critical",
    "Scalpel Wound": "Moderate",
    "Hammer Injury": "High",
    "Blunt Object Injury": "Moderate",
    "Screwdriver Injury": "Moderate",
    "Axe Injury": "Critical",
    "Glass Injury": "Moderate",
    "Gunshot Wound": "Critical",
    "Puncture Wound": "High",
    "Incised Wound": "Moderate",
    "Laceration": "Moderate",
    "Abrasion": "Low",
    "Contusion": "Low",
}

WEAPON_TO_CATEGORY = {
    "Knife": "Sharp",
    "Dagger": "Sharp",
    "Scalpel": "Sharp",
    "Hammer": "Blunt",
    "Blunt Object": "Blunt",
    "Screwdriver": "Sharp",
    "Axe": "Sharp",
    "Glass": "Sharp",
    "Gun": "Firearm",
    "Ice Pick": "Sharp",
    "Machete": "Sharp",
    "Other": "Other",
}

# Configurable confidence threshold (env override)
CONFIDENCE_THRESHOLD = float(os.getenv("FORENSIC_CONFIDENCE_THRESHOLD", "0.65"))
CANDIDATE_CONFIDENCE_THRESHOLD = float(os.getenv("FORENSIC_CANDIDATE_THRESHOLD", "0.02"))

LOW_CONFIDENCE_MESSAGE = "Low Confidence – Expert Review Recommended"

MODEL_WEIGHTS_PATH = os.getenv(
    "FORENSIC_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "best_forensic_model.pth"),
)
METRICS_PATH = os.path.join(os.path.dirname(__file__), "model_metrics.json")

