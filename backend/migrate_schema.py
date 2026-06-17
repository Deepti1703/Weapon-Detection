"""
Add missing columns/tables to an existing SQLite forensic_app.db without data loss.
Run automatically on app startup via main.py.
"""

import sqlite3
from database import engine, Base
import models  # noqa: F401 — register all models on Base.metadata


def _sqlite_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    cur = conn.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cur.fetchall()}


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


def _add_column(conn: sqlite3.Connection, table: str, ddl: str) -> None:
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def rename_table_if_exists(conn: sqlite3.Connection, old_name: str, new_name: str) -> None:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (old_name,))
    old_exists = cur.fetchone() is not None
    
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (new_name,))
    new_exists = cur.fetchone() is not None
    
    if old_exists and not new_exists:
        temp_name = f"temp_migrate_{old_name}"
        conn.execute(f"ALTER TABLE {old_name} RENAME TO {temp_name}")
        conn.execute(f"ALTER TABLE {temp_name} RENAME TO {new_name}")
        print(f"Renamed table {old_name} to {new_name}")


def rename_column_if_exists(conn: sqlite3.Connection, table: str, old_col: str, new_col: str) -> None:
    # Use case-insensitive table check for column renaming
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?", (table,))
    row = cur.fetchone()
    if not row:
        return
    actual_table_name = row[0]
    existing = _sqlite_columns(conn, actual_table_name)
    if old_col in existing and new_col not in existing:
        try:
            conn.execute(f"ALTER TABLE {actual_table_name} RENAME COLUMN {old_col} TO {new_col}")
            print(f"Renamed column {old_col} to {new_col} in {actual_table_name}")
        except Exception as e:
            print(f"Failed to rename column {old_col} to {new_col} in {actual_table_name}: {e}")


def migrate_sqlite_schema() -> None:
    url = str(engine.url)
    if not url.startswith("sqlite"):
        return

    db_path = url.replace("sqlite:///", "").replace("sqlite://", "")
    conn = sqlite3.connect(db_path)
    try:
        # 1. Rename tables to their new names
        rename_table_if_exists(conn, "users", "Users")
        rename_table_if_exists(conn, "Cases", "case_history")
        rename_table_if_exists(conn, "wound_images", "Wound_Images")
        rename_table_if_exists(conn, "weapons", "Weapon_Categories")
        rename_table_if_exists(conn, "predictions_log", "Predictions")
        rename_table_if_exists(conn, "verified_training_data", "Training_Dataset")
        rename_table_if_exists(conn, "reports", "Generated_Reports")
        rename_table_if_exists(conn, "audit_logs", "Audit_Logs")

        # 2. Rename columns inside tables if they exist under old names
        rename_column_if_exists(conn, "Users", "id", "user_id")
        rename_column_if_exists(conn, "Users", "hashed_password", "password_hash")
        rename_column_if_exists(conn, "Users", "name", "full_name")

        rename_column_if_exists(conn, "case_history", "id", "case_id")
        rename_column_if_exists(conn, "case_history", "case_reference", "case_number")
        rename_column_if_exists(conn, "case_history", "user_id", "analyst_id")
        rename_column_if_exists(conn, "case_history", "notes", "case_description_notes")

        rename_column_if_exists(conn, "Wound_Images", "id", "image_id")
        rename_column_if_exists(conn, "Wound_Images", "created_at", "upload_date")

        rename_column_if_exists(conn, "Weapon_Categories", "id", "weapon_id")
        rename_column_if_exists(conn, "Weapon_Categories", "name", "weapon_name")
        rename_column_if_exists(conn, "Weapon_Categories", "category", "weapon_type")
        rename_column_if_exists(conn, "Weapon_Categories", "wound_pattern_characteristics", "common_wound_patterns")

        rename_column_if_exists(conn, "Predictions", "id", "prediction_id")
        rename_column_if_exists(conn, "Predictions", "user_id", "analyst_id")
        rename_column_if_exists(conn, "Predictions", "predicted_wound_type", "wound_category")
        rename_column_if_exists(conn, "Predictions", "weapon_confidence", "confidence_score")
        rename_column_if_exists(conn, "Predictions", "model_version", "model_used")
        rename_column_if_exists(conn, "Predictions", "timestamp", "prediction_date")

        rename_column_if_exists(conn, "Training_Dataset", "id", "dataset_id")
        rename_column_if_exists(conn, "Training_Dataset", "verified_weapon", "actual_weapon")
        rename_column_if_exists(conn, "Training_Dataset", "verified_wound", "wound_type")
        rename_column_if_exists(conn, "Training_Dataset", "verified_at", "created_at")

        rename_column_if_exists(conn, "Generated_Reports", "id", "report_id")
        rename_column_if_exists(conn, "Generated_Reports", "user_id", "generated_by")
        rename_column_if_exists(conn, "Generated_Reports", "pdf_path", "report_path")
        rename_column_if_exists(conn, "Generated_Reports", "timestamp", "generated_date")

        rename_column_if_exists(conn, "Audit_Logs", "id", "log_id")
        rename_column_if_exists(conn, "Audit_Logs", "action", "activity")

        # 3. Add new columns to tables if they do not exist yet
        # Users
        if _table_exists(conn, "Users"):
            existing = _sqlite_columns(conn, "Users")
            if "created_at" not in existing: _add_column(conn, "Users", "created_at DATETIME")
            if "last_login" not in existing: _add_column(conn, "Users", "last_login DATETIME")
            if "status" not in existing: _add_column(conn, "Users", "status VARCHAR DEFAULT 'active'")

        # case_history
        if _table_exists(conn, "case_history"):
            existing = _sqlite_columns(conn, "case_history")
            if "victim_reference" not in existing: _add_column(conn, "case_history", "victim_reference VARCHAR")
            if "case_description" not in existing: _add_column(conn, "case_history", "case_description TEXT")
            if "wound_type" not in existing: _add_column(conn, "case_history", "wound_type VARCHAR")
            if "predicted_weapon" not in existing: _add_column(conn, "case_history", "predicted_weapon VARCHAR")
            if "confidence_score" not in existing: _add_column(conn, "case_history", "confidence_score FLOAT")
            if "severity_level" not in existing: _add_column(conn, "case_history", "severity_level VARCHAR")

        # Wound_Images
        if _table_exists(conn, "Wound_Images"):
            existing = _sqlite_columns(conn, "Wound_Images")
            if "image_type" not in existing: _add_column(conn, "Wound_Images", "image_type VARCHAR DEFAULT 'Upload'")
            if "image_status" not in existing: _add_column(conn, "Wound_Images", "image_status VARCHAR DEFAULT 'active'")
            if "case_id" not in existing: _add_column(conn, "Wound_Images", "case_id INTEGER")

        # Predictions
        if _table_exists(conn, "Predictions"):
            existing = _sqlite_columns(conn, "Predictions")
            if "case_id" not in existing: _add_column(conn, "Predictions", "case_id INTEGER")

        # Training_Dataset
        if _table_exists(conn, "Training_Dataset"):
            existing = _sqlite_columns(conn, "Training_Dataset")
            if "source" not in existing: _add_column(conn, "Training_Dataset", "source VARCHAR DEFAULT 'Verification Pipeline'")
            if "annotation_status" not in existing: _add_column(conn, "Training_Dataset", "annotation_status VARCHAR DEFAULT 'verified'")

        # Drop old index names starting with ix_Cases_ to avoid conflicts when creating new cases table
        indexes_to_drop = [
            "ix_Cases_case_id",
            "ix_Cases_status",
            "ix_Cases_report_id",
            "ix_Cases_created_at",
            "ix_Cases_analyst_id",
            "ix_Cases_wound_image_id",
            "ix_Cases_case_number"
        ]
        for idx in indexes_to_drop:
            try:
                conn.execute(f"DROP INDEX IF EXISTS {idx}")
            except Exception as e:
                print(f"Failed to drop conflicting index {idx}: {e}")

        conn.commit()
    finally:
        conn.close()

    # Create any brand-new tables (AI_Training_History, etc.)
    Base.metadata.create_all(bind=engine)

    # Create views for lowercase aliases if they don't exist
    url = str(engine.url)
    if url.startswith("sqlite"):
        db_path = url.replace("sqlite:///", "").replace("sqlite://", "")
        conn = sqlite3.connect(db_path)
        try:
            views_to_create = {
                "forensic_reports": "Generated_Reports",
                "datasets": "dataset_samples"
            }
            for view_name, target_table in views_to_create.items():
                conn.execute(f"DROP VIEW IF EXISTS {view_name}")
                conn.execute(f"CREATE VIEW {view_name} AS SELECT * FROM {target_table}")
            conn.commit()
            print("Lowercase views created/verified successfully.")
        except Exception as e:
            print(f"Failed to create lowercase views: {e}")
        finally:
            conn.close()

    # Seeding
    from database import SessionLocal
    from models import User, Role
    import auth
    db = SessionLocal()
    try:
        # Check and seed roles
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
        db.commit()

        # Seed super admin deepti
        admin = db.query(User).filter(User.username == "deepti").first()
        if not admin:
            print("Creating super admin user 'deepti'...")
            admin = User(
                username="deepti",
                email="deepti@example.com",
                hashed_password=auth.get_password_hash("admin123"),
                role="super_admin",
                is_profile_complete=True,
                full_name="Deepti Admin"
            )
            db.add(admin)
            db.commit()
            print("Admin user created (username: deepti, password: admin123)")
        else:
            # Update password, email, and role to match requirements
            admin.email = "deepti@example.com"
            admin.hashed_password = auth.get_password_hash("admin123")
            admin.role = "super_admin"
            db.commit()
            print("Admin user verified/updated (username: deepti, password: admin123)")
    except Exception as e:
        print(f"Failed to seed admin/roles: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate_sqlite_schema()
    print("Schema migration complete.")


