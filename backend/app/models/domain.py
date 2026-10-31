import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    domain = Column(String(64), default="Lending")  # Lending, Banking, Insurance, ERP, Other
    description = Column(Text, default="")
    target_schema_id = Column(String(64), nullable=True)
    template = Column(String(64), default="standard")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    sources = relationship("SourceDocument", back_populates="project", cascade="all, delete-orphan")
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="project", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="project", cascade="all, delete-orphan")
    runs = relationship("GenerationRun", back_populates="project", cascade="all, delete-orphan")

class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(String(64), primary_key=True)
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)  # BRD / Functional Spec, User Stories, Product Rules / Parameter Sheet, Template, Target Configuration Schema, Other
    mime_type = Column(String(128), default="application/octet-stream")
    file_size = Column(Integer, default=0)
    file_hash = Column(String(64), default="")
    storage_path = Column(String(512), nullable=False)
    version = Column(Integer, default=1)
    parse_state = Column(String(32), default="queued")  # queued, parsing, parsed, partial, failed, requires_review
    page_count = Column(Integer, default=0)
    worksheet_count = Column(Integer, default=0)
    parse_report = Column(JSON, default=dict)
    warnings = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="sources")
    spans = relationship("SourceSpan", back_populates="source", cascade="all, delete-orphan")

class SourceSpan(Base):
    __tablename__ = "source_spans"

    id = Column(String(64), primary_key=True)
    source_id = Column(String(64), ForeignKey("source_documents.id"), nullable=False)
    locator = Column(String(255), nullable=False)  # e.g., "P12", "Eligibility!B4", "page:2:block:3", "line:42"
    span_type = Column(String(32), default="text")  # paragraph, cell, page_block, json_pointer, line
    excerpt = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    source = relationship("SourceDocument", back_populates="spans")

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(String(64), primary_key=True)  # REQ-001, etc.
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    kind = Column(String(64), default="business_rule")  # business_rule, workflow_step, field_validation, dependency, unresolved_question
    statement = Column(Text, nullable=False)
    original_text = Column(Text, default="")
    structured_rule = Column(JSON, default=dict)
    source_span_ids = Column(JSON, default=list)  # list of span IDs
    status = Column(String(32), default="extracted")  # extracted, confirmed, corrected, rejected, conflict
    has_conflict = Column(Boolean, default=False)
    conflict_details = Column(JSON, default=dict)
    unresolved_question_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="requirements")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(64), primary_key=True)  # Q-001
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    impact = Column(Text, default="")
    is_blocking = Column(Boolean, default=True)
    competing_evidence = Column(JSON, default=list)
    suggested_options = Column(JSON, default=list)
    status = Column(String(32), default="open")  # open, answered, waived
    affected_requirement_ids = Column(JSON, default=list)
    affected_artifact_types = Column(JSON, default=list)
    answer = Column(Text, nullable=True)
    decision_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="questions")

class HumanDecision(Base):
    __tablename__ = "human_decisions"

    id = Column(String(64), primary_key=True)  # DEC-001
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    question_id = Column(String(64), nullable=True)
    answered_by = Column(String(128), default="Compliance Officer (Local Reviewer)")
    selected_option = Column(String(255), nullable=True)
    free_text_answer = Column(Text, default="")
    rationale = Column(Text, default="")
    linked_requirement_ids = Column(JSON, default=list)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(64), primary_key=True)  # ART-001
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    artifact_type = Column(String(64), nullable=False)  # configuration, workflow, mapping, test_suite
    current_version = Column(Integer, default=1)
    status = Column(String(32), default="draft")  # draft, validated, review_needed, approved
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="artifacts")
    versions = relationship("ArtifactVersion", back_populates="artifact", cascade="all, delete-orphan", order_by="desc(ArtifactVersion.version_number)")

class ArtifactVersion(Base):
    __tablename__ = "artifact_versions"

    id = Column(String(64), primary_key=True)  # ARTV-001
    artifact_id = Column(String(64), ForeignKey("artifacts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content_json = Column(JSON, default=dict)  # canonical JSON/YAML or workflow graph
    schema_version = Column(String(64), default="1.0.0")
    status = Column(String(32), default="draft")  # draft, validated, review_needed, approved
    validation_summary = Column(JSON, default=dict)
    author = Column(String(128), default="AI Implementation Studio")
    model_used = Column(String(128), default="openai/gpt-oss-20b")
    source_refs = Column(JSON, default=list)
    change_summary = Column(Text, default="Initial version")
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    artifact = relationship("Artifact", back_populates="versions")
    evidence_links = relationship("ArtifactEvidenceLink", back_populates="version", cascade="all, delete-orphan")

class ArtifactEvidenceLink(Base):
    __tablename__ = "artifact_evidence_links"

    id = Column(String(64), primary_key=True)
    artifact_version_id = Column(String(64), ForeignKey("artifact_versions.id"), nullable=False)
    target_pointer = Column(String(255), nullable=False)  # e.g., "/eligibility/applicant_age/max", "node_credit_decision"
    requirement_id = Column(String(64), nullable=True)
    source_span_id = Column(String(64), nullable=True)
    provenance_kind = Column(String(32), default="source_grounded")  # source_grounded, human_decision, manual_unverified
    note = Column(String(255), default="")

    version = relationship("ArtifactVersion", back_populates="evidence_links")

class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(String(64), primary_key=True)
    artifact_version_id = Column(String(64), nullable=False)
    is_valid = Column(Boolean, default=False)
    schema_valid = Column(Boolean, default=False)
    citation_coverage_pct = Column(Float, default=0.0)
    unresolved_questions_count = Column(Integer, default=0)
    rule_checks_passed = Column(Boolean, default=False)
    errors = Column(JSON, default=list)
    warnings = Column(JSON, default=list)
    run_at = Column(DateTime, default=datetime.datetime.utcnow)

class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id = Column(String(64), primary_key=True)
    project_id = Column(String(64), ForeignKey("projects.id"), nullable=False)
    prompt = Column(Text, default="")
    artifact_type = Column(String(64), default="configuration")
    model_profile = Column(String(32), default="Balanced")
    model_id = Column(String(128), default="openai/gpt-oss-20b")
    pipeline_state = Column(String(64), default="COMPLETED")
    status = Column(String(32), default="SUCCESS")
    events = Column(JSON, default=list)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="runs")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True)
    project_id = Column(String(64), nullable=False)
    actor = Column(String(128), default="System")
    action = Column(String(128), nullable=False)
    target_type = Column(String(64), default="")
    target_id = Column(String(64), default="")
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
