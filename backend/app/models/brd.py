import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BRDDocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class BRDDocument(Base):
    __tablename__ = "brd_documents"
    __table_args__ = (UniqueConstraint("project_id", "filename", name="uq_brd_document_project_filename"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False, default="brd")
    storage_path: Mapped[str | None] = mapped_column(String(512))
    content_type: Mapped[str | None] = mapped_column(String(120))
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BRDDocumentStatus] = mapped_column(Enum(BRDDocumentStatus), nullable=False, default=BRDDocumentStatus.UPLOADED)
    uploaded_by_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    extracted_text: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="brd_documents")
    uploaded_by = relationship("Employee")
    requirements = relationship("BRDRequirementSet", back_populates="document", cascade="all, delete-orphan")


class BRDRequirementSet(Base):
    __tablename__ = "brd_requirements"
    __table_args__ = (UniqueConstraint("document_id", "version", name="uq_brd_requirement_document_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(ForeignKey("brd_documents.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    overview: Mapped[str | None] = mapped_column(Text)
    functional_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    non_functional_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    assumptions_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_by: Mapped[str] = mapped_column(String(128), nullable=False, default="AI Engine")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("BRDDocument", back_populates="requirements")


class BRDDesignArtifact(Base):
    __tablename__ = "brd_design_artifacts"
    __table_args__ = (UniqueConstraint("project_id", "artifact_type", "version", name="uq_brd_artifact_project_type_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("brd_documents.id", ondelete="SET NULL"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    ai_provider: Mapped[str | None] = mapped_column(String(80))
    model_used: Mapped[str | None] = mapped_column(String(140))
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="brd_artifacts")
    document = relationship("BRDDocument")
    created_by = relationship("Employee")
