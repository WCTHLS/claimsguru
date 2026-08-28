import uuid
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, Text, UUID, String, UniqueConstraint, Date, Numeric, Index, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from libs.shared.db import Base

# --- Independent Lookup / Reference Tables ---

class TpaProvider(Base):
    __tablename__ = "tpa_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(255), unique=True, nullable=False)
    name = Column(Text, nullable=False)
    logo = Column(Text, default="🏥")
    provider_type = Column(Text, default="Private")
    email = Column(Text, nullable=True)
    phone = Column(Text, nullable=True)
    website = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- The Core Claim Model ---

class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(Text, nullable=True)
    patient_id = Column(Text, nullable=True)
    canonical_json = Column(JSONB, nullable=True)
    status = Column(Text, nullable=False, default="UPLOADED")
    source = Column(Text, nullable=True, default="PATIENT")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships (Targeted for High-Scale Cleanup)
    documents = relationship("Document", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    submissions = relationship("Submission", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    audit_logs = relationship("AuditLog", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    ocr_jobs = relationship("OcrJob", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    parse_jobs = relationship("ParseJob", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    parsed_fields = relationship("ParsedField", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    medical_entities = relationship("MedicalEntity", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    features = relationship("Feature", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    predictions = relationship("Prediction", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    validations = relationship("Validation", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    fraud_assessments = relationship("FraudAssessment", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    workflow_state = relationship("WorkflowState", back_populates="claim", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    workflow_jobs = relationship("WorkflowJob", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    scan_analyses = relationship("ScanAnalysis", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    doc_validations = relationship("DocValidation", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)
    chat_messages = relationship("ChatMessage", back_populates="claim", cascade="all, delete-orphan", passive_deletes=True)


# --- Supporting Models (Top Level) ---

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    payer = Column(Text, nullable=True)
    request_payload = Column(JSONB, nullable=True)
    response_payload = Column(JSONB, nullable=True)
    status = Column(Text, nullable=False, default="PENDING")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="submissions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Real DB columns (matched to infra/db/claimgpt_schema.sql + raw SQL in
    # services/submission/app/main.py and libs/utils/audit.py). Older revisions
    # of this model declared `service_name`/`timestamp` which never existed in
    # the live schema; selecting via the ORM blew up with UndefinedColumn.
    actor = Column(Text, nullable=True)
    action = Column(Text, nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=True)

    # RENAME: 'metadata' is reserved in SQLAlchemy Declarative
    audit_metadata = Column("metadata", JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    claim = relationship("Claim", back_populates="audit_logs")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(Text, nullable=False)
    file_type = Column(Text, nullable=True)
    minio_path = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    content_hash = Column(String(255), index=True, nullable=False)  # SHA-256 fingerprint of file content
    doc_type = Column(Text, nullable=True, default="UNKNOWN")
    display_title = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True, default=1)

    claim = relationship("Claim", back_populates="documents")
    ocr_results = relationship("OcrResult", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    scan_analyses = relationship("ScanAnalysis", back_populates="document")


class DocValidation(Base):
    __tablename__ = "document_validations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    status = Column(Text, nullable=False)
    doc_type = Column(Text, nullable=True)
    doc_type_label = Column(Text, nullable=True)
    is_medical = Column(Integer, nullable=False, default=1)
    patient_match = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    patient_name = Column(Text, nullable=True)
    patient_id_extracted = Column(Text, nullable=True)
    issues = Column(JSONB, nullable=True)
    validation_metadata = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="doc_validations")


class OcrResult(Base):
    __tablename__ = "ocr_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=True)
    text = Column(Text, nullable=True)
    # Store token-level OCR output (word boxes) as JSONB for layout analysis
    tokens = Column(JSONB, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="ocr_results")


class ParsedField(Base):
    __tablename__ = "parsed_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    field_name = Column(Text, nullable=False)
    field_value = Column(Text, nullable=True)
    bounding_box = Column(JSONB, nullable=True)
    source_page = Column(Integer, nullable=True)
    doc_type = Column(Text, nullable=True)
    model_version = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="parsed_fields")
    document = relationship("Document")


class ClaimFieldFeedback(Base):
    """User-supplied corrections to OCR/parser-extracted fields.

    The first time a user edits a parsed field we capture the original
    extracted value here (frozen) alongside the corrected value, so the UI
    can show a side-by-side diff and offer a one-click revert. Each later
    edit only updates `corrected_value`.
    """

    __tablename__ = "claim_field_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id"),
        nullable=True,
    )
    field_name = Column(Text, nullable=False)
    original_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)
    user_sub = Column(Text, nullable=True)
    user_email = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class MedicalEntity(Base):
    __tablename__ = "medical_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    entity_text = Column(Text, nullable=False)
    entity_type = Column(Text, nullable=False)
    start_offset = Column(Integer, nullable=True)
    end_offset = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="medical_entities")
    codes = relationship("MedicalCode", back_populates="entity", cascade="all, delete-orphan")


class MedicalCode(Base):
    __tablename__ = "medical_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("medical_entities.id"), nullable=True)
    code = Column(Text, nullable=False)
    code_system = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entity = relationship("MedicalEntity", back_populates="codes")


class Feature(Base):
    __tablename__ = "features"

    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True)
    feature_vector = Column(JSONB, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="features")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    rejection_score = Column(Float, nullable=True)
    top_reasons = Column(JSONB, nullable=True)
    model_name = Column(Text, nullable=True)
    model_version = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="predictions")


class Validation(Base):
    __tablename__ = "validations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(Text, nullable=True)
    rule_name = Column(Text, nullable=True)
    severity = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    passed = Column(Boolean, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="validations")


class FraudAssessment(Base):
    """Hybrid fraud signal (rules + ML + optional LLM)."""

    __tablename__ = "fraud_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    fraud_score = Column(Float, nullable=False)        # blended [0.0, 1.0]
    fraud_category = Column(Text, nullable=False)      # LOW / MEDIUM / HIGH
    rules_score = Column(Float, nullable=True)
    ml_score = Column(Float, nullable=True)
    llm_score = Column(Float, nullable=True)
    indicators = Column(JSONB, nullable=True)          # list of {code, name, severity, weight, message}
    model_name = Column(Text, nullable=True)
    model_version = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="fraud_assessments")


class WorkflowJob(Base):
    __tablename__ = "workflow_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    job_type = Column(Text, nullable=True)
    status = Column(Text, nullable=True)
    retries = Column(Integer, default=0)
    current_step = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    claim = relationship("Claim", back_populates="workflow_jobs")


class WorkflowState(Base):
    __tablename__ = "workflow_state"

    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True)
    current_step = Column(Text, nullable=True)
    status = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    claim = relationship("Claim", back_populates="workflow_state")


class ScanAnalysis(Base):
    __tablename__ = "scan_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    scan_type = Column(Text, nullable=False)
    body_part = Column(Text, nullable=True)
    modality = Column(Text, nullable=True)
    findings = Column(JSONB, nullable=True)
    impression = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    
    # RENAME: 'metadata' is reserved
    scan_metadata = Column("metadata", JSONB, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="scan_analyses")
    document = relationship("Document", back_populates="scan_analyses")


class OcrJob(Base):
    __tablename__ = "ocr_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    status = Column(Text, nullable=False, default="QUEUED")
    total_documents = Column(Integer, nullable=False, default=0)
    processed_documents = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    claim = relationship("Claim", back_populates="ocr_jobs")


class ParseJob(Base):
    __tablename__ = "parse_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    status = Column(Text, nullable=False, default="QUEUED")
    total_documents = Column(Integer, nullable=False, default=0)
    processed_documents = Column(Integer, nullable=False, default=0)
    set_hash = Column(String(255), index=True, nullable=True)  # Set-based idempotency hash
    model_version = Column(Text, nullable=True)
    used_fallback = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    claim = relationship("Claim", back_populates="parse_jobs")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    role = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="chat_messages")


# --- Identity, Profile, and Role Access Tables ---

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(255), nullable=True)
    external_provider = Column(String(255), nullable=False)
    external_subject_id = Column(String(255), nullable=False)
    status = Column(Text, nullable=False, default="PENDING")
    email_verified = Column(Boolean, nullable=False, default=False)
    password_hash = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("external_provider", "external_subject_id", name="uq_user_external_provider_subject"),
        Index("uq_users_phone", "phone", unique=True, mssql_where=text("phone IS NOT NULL")),
    )


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    address = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    dob = Column(Date, nullable=True)
    gender = Column(Text, nullable=True)
    policy_number = Column(Text, nullable=True)
    sum_insured = Column(Numeric(14, 2), nullable=True)
    insurer_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    health_card_url = Column(Text, nullable=True)
    coverage_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    employee_id = Column(String(255), nullable=True)
    designation = Column(Text, nullable=True)
    department = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "employee_id", name="uq_staff_org_employee"),
    )


class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserRoleTable(Base):
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="reviewer")
    status = Column(Text, nullable=False, default="PENDING")
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    token = Column(String(255), unique=True, nullable=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())