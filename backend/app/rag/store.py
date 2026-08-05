import hashlib
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.delivery import Account, Project
from app.models.status import WeeklyStatus


class HashEmbeddingFunction:
    """Small deterministic embedding fallback; swap with a managed embedding API in production."""

    def __call__(self, input: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in input:
            digest = hashlib.sha256(text.encode("utf-8")).digest()
            vectors.append([((byte / 255.0) * 2) - 1 for byte in digest] * 12)
        return vectors


def collection():
    import chromadb

    settings = get_settings()
    client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
    return client.get_or_create_collection(name=settings.chroma_collection, embedding_function=HashEmbeddingFunction())


def document_from_status(status: WeeklyStatus, project: Project | None, account: Account | None) -> tuple[str, dict]:
    parts = [
        f"Week: {status.week_start}",
        f"Employee: {status.employee_id}",
        f"Project: {project.name if project else 'Unassigned'}",
        f"Account: {account.name if account else 'Unassigned'}",
        f"Submission status: {status.status.value}",
        "Fields:",
        str(status.fields),
        f"Manager comment: {status.manager_comment or ''}",
    ]
    metadata = {
        "status_id": status.id,
        "employee_id": status.employee_id,
        "project_id": status.project_id or "",
        "account_id": account.id if account else "",
        "week_start": str(status.week_start),
    }
    return "\n".join(parts), metadata


def index_statuses(db: Session, statuses: Iterable[WeeklyStatus] | None = None) -> int:
    rows = list(statuses or db.scalars(select(WeeklyStatus)).all())
    if not rows:
        return 0
    docs: list[str] = []
    ids: list[str] = []
    metas: list[dict] = []
    for status in rows:
        project = db.get(Project, status.project_id) if status.project_id else None
        account = db.get(Account, project.account_id) if project else None
        doc, meta = document_from_status(status, project, account)
        docs.append(doc)
        ids.append(status.id)
        metas.append(meta)
    collection().upsert(ids=ids, documents=docs, metadatas=metas)
    return len(rows)


def search_knowledge(question: str, top_k: int = 5, project_id: str | None = None) -> list[dict]:
    where = {"project_id": project_id} if project_id else None
    results = collection().query(query_texts=[question], n_results=top_k, where=where)
    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    return [
        {"document": doc, "metadata": metadata or {}, "distance": distance}
        for doc, metadata, distance in zip(docs, metadatas, distances, strict=False)
    ]
