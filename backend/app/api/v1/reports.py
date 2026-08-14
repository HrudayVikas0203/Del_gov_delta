import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from app.core.config import get_settings
from app.core.security import get_current_user, require_min_role
from app.db.session import get_db
from app.models.delivery import Account, Project
from app.models.people import Employee, Role
from app.models.status import GeneratedReport, ReportFormat, ReportTemplate
from app.reports.generator import generate_report_file
from app.schemas.common import LLMSelection, ReportCreate, ReportOut, ReportTemplateOut
from app.services.audit import audit
from app.workers.tasks import generate_report_task

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> GeneratedReport:
    scope_parts = [payload.scope]
    if payload.account_id:
        scope_parts.append(f"account:{payload.account_id}")
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
        if payload.account_id and template.account_id and template.account_id != payload.account_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected template belongs to a different account")

    report = GeneratedReport(
        title=payload.title,
        report_type=payload.report_type,
        report_format=payload.report_format,
        scope=scope,
        template_id=template.id if template else None,
        generated_by_id=actor.id,
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
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report generation failed: {exc}",
            ) from exc
        db.refresh(report)
    return report


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[GeneratedReport]:
    return list(db.scalars(select(GeneratedReport).order_by(GeneratedReport.generated_at.desc())).all())




@router.post("/templates", response_model=ReportTemplateOut, status_code=201)
def upload_report_template(
    name: str = Form(...),
    account_id: str | None = Form(None),
    project_id: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER)),
) -> ReportTemplate:
    settings = get_settings()
    extension = Path(file.filename).suffix.lower()
    if extension not in {".pptx", ".pdf"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PPTX and PDF templates are supported")
    if account_id and not db.get(Account, account_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if project_id:
        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        if account_id and project.account_id != account_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project does not belong to selected account")
        account_id = project.account_id

    template_dir = settings.templates_dir
    saved_path = template_dir / f"{uuid.uuid4()}{extension}"

    with saved_path.open("wb") as f:
        f.write(file.file.read())

    template = ReportTemplate(
        name=name,
        file_path=str(saved_path),
        file_type=extension.lstrip("."),
        account_id=account_id,
        project_id=project_id,
        uploaded_by_id=actor.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/templates", response_model=list[ReportTemplateOut])
def list_report_templates(
    account_id: str | None = None,
    project_id: str | None = None,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> list[ReportTemplate]:
    stmt = select(ReportTemplate).order_by(ReportTemplate.uploaded_at.desc())
    if project_id:
        stmt = stmt.where((ReportTemplate.project_id == project_id) | (ReportTemplate.project_id.is_(None)))
    if account_id:
        stmt = stmt.where((ReportTemplate.account_id == account_id) | (ReportTemplate.account_id.is_(None)))
    return list(db.scalars(stmt).all())
@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> FileResponse:
    report = db.get(GeneratedReport, report_id)
    if report is None or not report.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    report_path = Path(report.file_path)
    if not report_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found")

    return FileResponse(str(report_path), filename=report_path.name, media_type="application/octet-stream")


