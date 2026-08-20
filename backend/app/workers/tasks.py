from app.db.session import SessionLocal
from app.models.status import GeneratedReport
from app.rag.store import index_statuses
from app.reports.generator import generate_report_file
from app.schemas.common import LLMSelection
from app.workers.celery_app import celery_app


@celery_app.task(name="reports.generate")
def generate_report_task(report_id: str) -> str:
    with SessionLocal() as db:
        report = db.get(GeneratedReport, report_id)
        llm = LLMSelection(provider=report.llm_provider, model=report.llm_model) if report and report.llm_provider else None
        return generate_report_file(db, report_id, llm)


@celery_app.task(name="rag.index_statuses")
def index_statuses_task() -> int:
    with SessionLocal() as db:
        return index_statuses(db)
