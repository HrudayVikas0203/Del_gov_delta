from app.db.session import SessionLocal
from app.rag.store import index_statuses
from app.reports.generator import generate_report_file
from app.workers.celery_app import celery_app


@celery_app.task(name="reports.generate")
def generate_report_task(report_id: str) -> str:
    with SessionLocal() as db:
        return generate_report_file(db, report_id)


@celery_app.task(name="rag.index_statuses")
def index_statuses_task() -> int:
    with SessionLocal() as db:
        return index_statuses(db)
