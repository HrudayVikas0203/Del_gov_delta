import enum
import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.dialects.mysql import LONGBLOB, MEDIUMBLOB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SubmissionStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    PPTX = "pptx"
    XLSX = "xlsx"


class ReportType(str, enum.Enum):
    EXECUTIVE_SUMMARY = "executive_summary"
    PROJECT_REPORT = "project_report"
    PORTFOLIO_REPORT = "portfolio_report"
    CLIENT_REPORT = "client_report"


class WeeklyStatus(Base):
    __tablename__ = "weekly_statuses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.DRAFT)
    fields: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    manager_comment: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="weekly_statuses")
    project = relationship("Project", back_populates="weekly_statuses")


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(30), nullable=False)
    recommendations: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    health_score: Mapped[int] = mapped_column(Integer, nullable=False)
    sentiment_score: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType), nullable=False)
    report_format: Mapped[ReportFormat] = mapped_column(Enum(ReportFormat), nullable=False)
    scope: Mapped[str] = mapped_column(String(220), nullable=False)
    template_id: Mapped[str | None] = mapped_column(ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500))
    filename: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(120))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    content_bytes: Mapped[bytes | None] = mapped_column(LargeBinary().with_variant(LONGBLOB, "mysql"))
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="generating")
    generated_by_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    llm_provider: Mapped[str | None] = mapped_column(String(40))
    llm_model: Mapped[str | None] = mapped_column(String(120))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    template = relationship("ReportTemplate", lazy="joined")


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    filename: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(120))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    content_bytes: Mapped[bytes | None] = mapped_column(LargeBinary().with_variant(MEDIUMBLOB, "mysql"))
    content_sha256: Mapped[str | None] = mapped_column(String(64))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    account_id: Mapped[str | None] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    uploaded_by_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    module: Mapped[str] = mapped_column(String(120), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(80))
