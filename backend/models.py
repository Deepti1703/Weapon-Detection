from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship, synonym
from database import Base
import datetime


class Role(Base):
    """System roles for RBAC."""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # forensic_analyst, super_admin, manager, auditor, doctor
    description = Column(Text, nullable=True)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WoundCategory(Base):
    """Reference wound taxonomy."""
    __tablename__ = "wound_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    typical_severity = Column(String, nullable=True)
    forensic_indicators = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WoundWeaponMapping(Base):
    """Probabilistic wound type -> weapon relationships."""
    __tablename__ = "wound_weapon_mappings"

    id = Column(Integer, primary_key=True, index=True)
    wound_category_id = Column(Integer, ForeignKey("wound_categories.id"), index=True)
    weapon_id = Column(Integer, ForeignKey("Weapon_Categories.weapon_id"), index=True)
    probability_weight = Column(Float, default=1.0)
    forensic_rationale = Column(Text, nullable=True)


class WoundImage(Base):
    """Structured dataset table for wound images with annotations."""
    __tablename__ = "Wound_Images"

    id = Column("image_id", Integer, primary_key=True, index=True)
    image_path = Column(String, unique=True, index=True)
    wound_type = Column(String, index=True)
    weapon_type = Column(String, index=True)
    severity = Column(String, nullable=True, index=True)
    anatomical_location = Column(String, nullable=True, index=True)
    annotations = Column(JSON, nullable=True)
    lighting_conditions = Column(String, nullable=True)
    angle_of_capture = Column(String, nullable=True)
    image_quality = Column(String, default="good")
    
    analyst_id = Column(Integer, ForeignKey("Users.user_id"), nullable=True, index=True)
    is_training_sample = Column(Boolean, default=False, index=True)
    dataset_split = Column(String, nullable=True)  # train, val, test
    is_public = Column(Boolean, default=False)
    
    upload_date = Column("upload_date", DateTime, default=datetime.datetime.utcnow, index=True)
    created_at = synonym("upload_date")
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    image_type = Column(String, default="Upload")  # Upload/Live Capture
    image_status = Column(String, default="active")
    
    case_id = Column(Integer, ForeignKey("case_history.case_id"), nullable=True, index=True)

    image_id = synonym("id")

    predictions = relationship("PredictionLog", back_populates="image")
    training_metadata = relationship("TrainingDatasetMetadata", back_populates="wound_image", uselist=False)


class Weapon(Base):
    """Reference table for weapon types and their characteristics."""
    __tablename__ = "Weapon_Categories"

    id = Column("weapon_id", Integer, primary_key=True, index=True)
    
    weapon_name = Column("weapon_name", String, unique=True, index=True)
    name = synonym("weapon_name")
    
    description = Column(Text, nullable=True)
    
    common_wound_patterns = Column("common_wound_patterns", JSON, nullable=True)  # Typical wound patterns
    wound_pattern_characteristics = synonym("common_wound_patterns")
    
    weapon_type = Column("weapon_type", String)  # Sharp, Blunt, Firearm, Other
    category = synonym("weapon_type")
    
    typical_severity = Column(String, nullable=True)  # Low, Moderate, High, Critical
    forensic_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    weapon_id = synonym("id")


class PredictionLog(Base):
    """Detailed logging of all model predictions for analysis and improvement."""
    __tablename__ = "Predictions"

    id = Column("prediction_id", Integer, primary_key=True, index=True)
    user_id = Column("analyst_id", Integer, ForeignKey("Users.user_id"), index=True)
    analyst_id = synonym("user_id")
    
    image_id = Column(Integer, ForeignKey("Wound_Images.image_id"), nullable=True, index=True)
    case_id = Column(Integer, ForeignKey("case_history.case_id"), nullable=True, index=True)

    predicted_weapon = Column(String, index=True)
    
    wound_category = Column("wound_category", String, index=True)
    predicted_wound_type = synonym("wound_category")
    
    confidence_score = Column("confidence_score", Float, index=True)
    weapon_confidence = synonym("confidence_score")
    
    wound_confidence = Column(Float, index=True)
    top_3_weapon_alternatives = Column(JSON, nullable=True)
    top_3_wound_alternatives = Column(JSON, nullable=True)
    gradcam_path = Column(String, nullable=True)
    
    model_used = Column("model_used", String, default="v1.0", index=True)
    model_version = synonym("model_used")
    
    preprocessing_applied = Column(JSON, nullable=True)
    inference_time_ms = Column(Float, nullable=True)
    is_low_confidence = Column(Boolean, default=False, index=True)
    requires_manual_review = Column(Boolean, default=False, index=True)
    expert_review_status = Column(String, default="pending")  # pending, validated, corrected
    
    prediction_date = Column("prediction_date", DateTime, default=datetime.datetime.utcnow, index=True)
    timestamp = synonym("prediction_date")

    prediction_id = synonym("id")

    image = relationship("WoundImage", back_populates="predictions")
    user = relationship("User")
    validations = relationship("PredictionValidation", back_populates="prediction")
    case = relationship("CaseHistory", back_populates="prediction", uselist=False, foreign_keys="CaseHistory.prediction_id")


class CaseHistory(Base):
    """Forensic case linking analyst, image, prediction, and report."""
    __tablename__ = "case_history"

    id = Column("case_id", Integer, primary_key=True, index=True)
    
    case_number = Column("case_number", String, unique=True, index=True)
    case_reference = synonym("case_number")
    
    user_id = Column("analyst_id", Integer, ForeignKey("Users.user_id"), index=True)
    analyst_id = synonym("user_id")
    
    wound_image_id = Column(Integer, ForeignKey("Wound_Images.image_id"), nullable=True, index=True)
    prediction_id = Column(Integer, ForeignKey("Predictions.prediction_id"), nullable=True, unique=True)
    report_id = Column(Integer, ForeignKey("Generated_Reports.report_id"), nullable=True, index=True)
    
    victim_reference = Column(String, nullable=True)
    case_description = Column(Text, nullable=True)
    
    wound_type = Column(String, nullable=True)
    predicted_weapon = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    severity_level = Column(String, nullable=True)
    
    status = Column(String, default="open", index=True)  # open, reviewed, closed
    
    notes = Column("case_description_notes", Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    case_id = synonym("id")
    prediction = relationship("PredictionLog", back_populates="case", foreign_keys="CaseHistory.prediction_id")


class TrainingDatasetMetadata(Base):
    """Metadata for each training/validation image."""
    __tablename__ = "training_dataset_metadata"

    id = Column(Integer, primary_key=True, index=True)
    wound_image_id = Column(Integer, ForeignKey("Wound_Images.image_id"), unique=True, index=True)
    source = Column(String, nullable=True)
    augmentation_applied = Column(JSON, nullable=True)
    preprocessing_version = Column(String, default="v1")
    label_confidence = Column(Float, nullable=True)
    verified_by_analyst = Column(Boolean, default=False)
    split = Column(String, index=True)  # train, val, test
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    wound_image = relationship("WoundImage", back_populates="training_metadata")


class PredictionValidation(Base):
    """Analyst corrections for continuous learning."""
    __tablename__ = "prediction_validations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("Predictions.prediction_id"), index=True)
    validator_id = Column(Integer, ForeignKey("Users.user_id"), index=True)
    corrected_weapon = Column(String, nullable=True)
    corrected_wound_type = Column(String, nullable=True)
    corrected_severity = Column(String, nullable=True)
    validation_notes = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    prediction = relationship("PredictionLog", back_populates="validations")


class User(Base):
    __tablename__ = "Users"

    id = Column("user_id", Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    
    password_hash = Column("password_hash", String)
    hashed_password = synonym("password_hash")
    
    role = Column(String, default="forensic_analyst")  # Options: forensic_analyst, admin, user
    
    # Profile Setup Fields
    is_profile_complete = Column(Boolean, default=False)
    
    full_name = Column("full_name", String, nullable=True)
    name = synonym("full_name")
    
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    id_proof = Column(String, nullable=True)  # general ID proof path, though we have specific table now
    
    # User added fields
    photo = Column(String, nullable=True)
    education = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    dob = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    biometric_enabled = Column(Boolean, default=False)
    
    # Soft Delete Fields
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    status = Column(String, default="active")

    user_id = synonym("id")

    # Relationships
    embeddings = relationship("FaceEmbedding", back_populates="user", cascade="all, delete-orphan")
    id_verification = relationship("IDVerification", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    permissions = Column(JSON, nullable=True)  # Could store fine-grained permissions if needed

    user = relationship("User")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), index=True)
    embedding = Column(JSON)  # JSON array of 128-d / 512-d floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="embeddings")


class IDVerification(Base):
    __tablename__ = "id_verification"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), unique=True, index=True)
    document_type = Column(String)  # E.g., Aadhaar, Passport
    document_path = Column(String)
    extracted_data = Column(JSON, nullable=True)  # OCR findings
    status = Column(String, default="pending")  # pending, approved, rejected
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="id_verification")


class Report(Base):
    """Generated forensic reports linked to predictions."""
    __tablename__ = "Generated_Reports"

    id = Column("report_id", Integer, primary_key=True, index=True)
    
    generated_by = Column("generated_by", Integer, ForeignKey("Users.user_id"), index=True)
    user_id = synonym("generated_by")
    
    prediction_id = Column(Integer, ForeignKey("Predictions.prediction_id"), nullable=True, index=True)
    case_id = Column(Integer, ForeignKey("case_history.case_id"), nullable=True, index=True)
    image_path = Column(String, nullable=True)
    predicted_weapon = Column(String, index=True)
    weapon_probability = Column(Float)
    predicted_wound_type = Column(String, index=True)
    wound_probability = Column(Float)
    severity = Column(String, nullable=True)
    precautions = Column(JSON, nullable=True)
    forensic_notes = Column(JSON, nullable=True)
    
    report_path = Column("report_path", String, nullable=True)
    pdf_path = synonym("report_path")
    
    doctor_notes = Column(Text, nullable=True)
    
    generated_date = Column("generated_date", DateTime, default=datetime.datetime.utcnow, index=True)
    timestamp = synonym("generated_date")
    
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    report_id = synonym("id")

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "Audit_Logs"

    id = Column("log_id", Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    
    activity = Column("activity", String, index=True)
    action = synonym("activity")
    
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    log_id = synonym("id")


class VerifiedTrainingData(Base):
    """Analyst-verified cases queued for continuous learning."""
    __tablename__ = "Training_Dataset"

    id = Column("dataset_id", Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("Predictions.prediction_id"), nullable=True, index=True)
    image_path = Column(String, index=True)
    predicted_weapon = Column(String, index=True)
    predicted_wound = Column(String, index=True)
    confidence_score = Column(Float)
    
    actual_weapon = Column("actual_weapon", String, index=True)
    verified_weapon = synonym("actual_weapon")
    
    verified_wound = Column("wound_type", String, index=True)
    wound_type = synonym("verified_wound")
    
    is_corrected = Column(Boolean, default=False)
    remarks = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("Users.user_id"), index=True)
    
    created_at = Column("created_at", DateTime, default=datetime.datetime.utcnow, index=True)
    verified_at = synonym("created_at")
    
    training_status = Column(String, default="pending", index=True)  # pending, queued, trained
    dataset_weapon_path = Column(String, nullable=True)
    dataset_wound_path = Column(String, nullable=True)
    gradcam_path = Column(String, nullable=True)
    attention_map_path = Column(String, nullable=True)
    confidence_distribution = Column(JSON, nullable=True)
    
    source = Column(String, default="Verification Pipeline")
    annotation_status = Column(String, default="verified")

    dataset_id = synonym("id")
    verifier = relationship("User", foreign_keys=[verified_by])


class DeletedRecord(Base):
    """Recycle bin functionality."""
    __tablename__ = "deleted_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String, index=True)  # 'User', 'Report', etc.
    original_id = Column(Integer, index=True)
    deleted_data = Column(JSON, nullable=True)
    deleted_by = Column(String, nullable=True)
    deleted_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, index=True)  # email or phone number
    otp = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AITrainingHistory(Base):
    """AI retraining runs and metrics."""
    __tablename__ = "AI_Training_History"

    id = Column("training_id", Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    dataset_count = Column(Integer, default=0)
    accuracy = Column(Float, nullable=True)
    precision_score = Column(Float, nullable=True)
    recall_score = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    training_date = Column(DateTime, default=datetime.datetime.utcnow)

    training_id = synonym("id")


class Case(Base):
    """Case model mapping to the cases database table."""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True)
    victim_reference = Column(String, nullable=True)
    case_description = Column(Text, nullable=True)
    uploaded_image = Column(String, nullable=True)
    predicted_weapon = Column(String, nullable=True)
    predicted_wound_type = Column(String, nullable=True)
    weapon_confidence = Column(Float, nullable=True)
    wound_confidence = Column(Float, nullable=True)
    severity_level = Column(String, nullable=True)
    forensic_notes = Column(Text, nullable=True)
    analyst_name = Column(String, nullable=True)
    analyst_role = Column(String, nullable=True)
    analysis_timestamp = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class DatasetSample(Base):
    """Analyst-verified cases registered in the training dataset."""
    __tablename__ = "dataset_samples"

    sample_id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, index=True)
    weapon_class = Column(String, index=True)
    wound_type = Column(String, index=True)
    verified_by = Column(String, nullable=True)
    verified_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="pending") # pending, trained


class TrainingHistory(Base):
    """Persisted training history runs with metrics."""
    __tablename__ = "training_history"

    id = Column(Integer, primary_key=True, index=True)
    model_version = Column(String, index=True)
    dataset_size = Column(Integer)
    epochs = Column(Integer)
    batch_size = Column(Integer)
    learning_rate = Column(Float)
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    training_start = Column(DateTime, default=datetime.datetime.utcnow)
    training_end = Column(DateTime, nullable=True)
    status = Column(String) # running, completed, failed


class ModelVersion(Base):
    """Ensemble model version metadata."""
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, index=True)
    filepath = Column(String)
    accuracy = Column(Float)
    f1_score = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=False)



