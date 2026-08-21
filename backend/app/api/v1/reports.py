from pathlib import Path
import logging
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.responses import FileResponse, Response

from app.ai.ppt_mapping import GeminiMappingConfigurationError, GeminiMappingError
from app.core.security import get_current_user, require_min_role
from app.db.session import get_db
from app.models.delivery import Project
from app.models.people import Employee, Role
from app.models.status import GeneratedReport, ReportFormat, ReportTemplate
from app.reports.generator import generate_report_file
from app.schemas.common import ReportCreate, ReportOut
from app.services.audit import audit
from app.services.template_storage import (
    InvalidTemplateError,
    TemplateNotConfiguredError,
    TemplateStorageError,
    find_account_template,
)
from app.workers.tasks import generate_report_task

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


def _match_report_template(db: Session, payload: ReportCreate) -> ReportTemplate | None:
    requested_type = payload.report_format.value
    project_id = payload.project_id or None
    account_id = payload.account_id or None

    if project_id:
        project = db.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        if account_id and account_id != project.account_id:
            raise HTTPException(status_code=400, detail="Project does not belong to selected account")
        account_id = project.account_id

    if account_id and requested_type == ReportFormat.PPTX.value:
        return find_account_template(db, account_id)

    if requested_type == ReportFormat.PPTX.value:
        return None

    if project_id:
        project_template = db.scalar(
            select(ReportTemplate)
            .where(ReportTemplate.project_id == project_id, ReportTemplate.file_type == requested_type)
            .order_by(ReportTemplate.uploaded_at.desc())
        )
        if project_template:
            return project_template

    if account_id:
        account_template = db.scalar(
            select(ReportTemplate)
            .where(ReportTemplate.account_id == account_id, ReportTemplate.file_type == requested_type)
            .order_by(ReportTemplate.uploaded_at.desc())
        )
        if account_template:
            return account_template

    return db.scalar(
        select(ReportTemplate)
        .where(ReportTemplate.project_id.is_(None), ReportTemplate.account_id.is_(None), ReportTemplate.file_type == requested_type)
        .order_by(ReportTemplate.uploaded_at.desc())
    )


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> GeneratedReport:
    if payload.project_id:
        project = db.get(Project, payload.project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        if payload.account_id and payload.account_id != project.account_id:
            raise HTTPException(status_code=400, detail="Project does not belong to selected account")
        effective_account_id = project.account_id
    else:
        effective_account_id = payload.account_id

    scope_parts = [payload.scope]
    if effective_account_id:
        scope_parts.append(f"account:{effective_account_id}")
    if payload.project_id:
        scope_parts.append(f"project:{payload.project_id}")
    if payload.employee_id:
        scope_parts.append(f"employee:{payload.employee_id}")
    if payload.status_frequency:
        scope_parts.append(f"period:{payload.status_frequency}")
    scope = " ".join(scope_parts)

    template = None
    if payload.template_id:
        template = db.get(ReportTemplate, payload.template_id)
        if template is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected template not found")
        if (
            (template.file_type == "pptx" and payload.report_format != ReportFormat.PPTX)
            or (template.file_type == "pdf" and payload.report_format != ReportFormat.PDF)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected template must match the requested report format",
            )
        if payload.project_id and template.project_id and template.project_id != payload.project_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected template belongs to a different project")
        if effective_account_id and template.account_id and template.account_id != effective_account_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected template belongs to a different account")
        if payload.report_format == ReportFormat.PPTX and (
            not effective_account_id
            or template.account_id != effective_account_id
            or template.project_id is not None
            or not template.is_active
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected PPT template does not belong to the report account")
    else:
        template = _match_report_template(db, payload.model_copy(update={"account_id": effective_account_id}))

    if payload.report_format == ReportFormat.PPTX:
        if not effective_account_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select one account before generating a PPT report")
        if template is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account PPT template is not configured.")
        if not template.content_bytes:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to retrieve the account PPT template.")

    report = GeneratedReport(
        title=payload.title,
        report_type=payload.report_type,
        report_format=payload.report_format,
        scope=scope,
        template_id=template.id if template else None,
        generated_by_id=actor.id,
        llm_provider=payload.llm.provider if payload.llm else None,
        llm_model=payload.llm.model if payload.llm else None,
    )
    db.add(report)
    audit(db, actor.id, "Report Requested", "Reports", f"{report.title} requested in {report.report_format.value}")
    db.commit()
    db.refresh(report)
    if payload.use_celery:
        generate_report_task.delay(report.id)
    else:
        try:
            generate_report_file(db, report.id, payload.llm)
        except Exception as exc:
            report.status = "failed"
            db.commit()
            if isinstance(exc, TemplateNotConfiguredError):
                detail = exc.client_message
                response_status = status.HTTP_400_BAD_REQUEST
            elif isinstance(exc, InvalidTemplateError):
                detail = exc.client_message
                response_status = status.HTTP_422_UNPROCESSABLE_ENTITY
            elif isinstance(exc, TemplateStorageError):
                detail = exc.client_message
                response_status = status.HTTP_500_INTERNAL_SERVER_ERROR
            elif isinstance(exc, GeminiMappingConfigurationError):
                detail = "Gemini PPT mapping is not configured."
                response_status = status.HTTP_400_BAD_REQUEST
            elif isinstance(exc, GeminiMappingError):
                detail = "Gemini PPT mapping failed. Please check the AI provider configuration."
                response_status = status.HTTP_502_BAD_GATEWAY
            else:
                detail = "Unable to generate the report."
                response_status = status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(
                status_code=response_status,
                detail=detail,
            ) from exc
        db.refresh(report)
    return report


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[GeneratedReport]:
    return list(db.scalars(select(GeneratedReport).order_by(GeneratedReport.generated_at.desc())).all())




@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> Response:
    report = db.get(GeneratedReport, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if report.content_bytes:
        filename = report.filename or f"{report.id}.{report.report_format.value}"
        return Response(
            content=bytes(report.content_bytes),
            media_type=report.content_type or "application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
        )
    if not report.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found")
    report_path = Path(report.file_path)
    if not report_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found")

    return FileResponse(str(report_path), filename=report_path.name, media_type="application/octet-stream")


