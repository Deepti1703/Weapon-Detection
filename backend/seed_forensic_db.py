"""
Seed forensic reference data: roles, wound categories, weapons, wound-weapon mappings.
Run: python seed_forensic_db.py
"""

from database import SessionLocal, engine, Base
from models import Role, WoundCategory, Weapon, WoundWeaponMapping
from forensic_taxonomy import WOUND_CLASSES, WEAPON_CLASSES, WOUND_TO_WEAPONS, WOUND_TO_SEVERITY, WEAPON_TO_CATEGORY

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        roles = [
            ("forensic_analyst", "Perform wound analysis and reporting"),
            ("super_admin", "Full system administration"),
            ("manager", "User and case management"),
            ("auditor", "Read-only audit access"),
            ("doctor", "Medical examiner review"),
            ("medical_examiner", "Clinical forensic review"),
        ]
        for name, desc in roles:
            if not db.query(Role).filter(Role.name == name).first():
                db.add(Role(name=name, description=desc))

        for wound in WOUND_CLASSES:
            if not db.query(WoundCategory).filter(WoundCategory.name == wound).first():
                db.add(WoundCategory(
                    name=wound,
                    description=f"Forensic wound category: {wound}",
                    typical_severity=WOUND_TO_SEVERITY.get(wound, "Moderate"),
                ))

        for weapon_name in WEAPON_CLASSES:
            if not db.query(Weapon).filter(Weapon.name == weapon_name).first():
                db.add(Weapon(
                    name=weapon_name,
                    category=WEAPON_TO_CATEGORY.get(weapon_name, "Other"),
                    typical_severity="High" if weapon_name in ["Gun", "Axe", "Dagger"] else "Moderate",
                    forensic_notes=f"Reference profile for {weapon_name}",
                ))

        db.commit()

        for wound_name, weapons in WOUND_TO_WEAPONS.items():
            wc = db.query(WoundCategory).filter(WoundCategory.name == wound_name).first()
            if not wc:
                continue
            for wname in weapons:
                wep = db.query(Weapon).filter(Weapon.name == wname).first()
                if not wep:
                    continue
                exists = db.query(WoundWeaponMapping).filter(
                    WoundWeaponMapping.wound_category_id == wc.id,
                    WoundWeaponMapping.weapon_id == wep.id,
                ).first()
                if not exists:
                    db.add(WoundWeaponMapping(
                        wound_category_id=wc.id,
                        weapon_id=wep.id,
                        probability_weight=1.0,
                        forensic_rationale=f"{wound_name} commonly associated with {wname}",
                    ))
        db.commit()
        print("Forensic database seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

