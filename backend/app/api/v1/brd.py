import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings, resolve_app_path
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.brd import BRDDesignArtifact, BRDDocument, BRDDocumentStatus, BRDRequirementSet
from app.models.delivery import Project
from app.models.people import Employee
from app.schemas.common import (
    BRDArtifactCreate,
    BRDArtifactOut,
    BRDChatOut,
    BRDChatRequest,
    BRDDocumentOut,
    BRDGenerateRequest,
    RequirementOut,
    RequirementSave,
)
from app.services.audit import audit
from app.services.llm import generate_text

router = APIRouter(prefix="/brd", tags=["brd-studio"])


def _json_dump(value: object) -> str:
    return json.dumps(value or [], ensure_ascii=False)


def _json_load(value: str | None, fallback: object) -> object:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _hydrate_document(document: BRDDocument, db: Session) -> BRDDocument:
    project = db.get(Project, document.project_id)
    setattr(document, "project_name", project.name if project else None)
    return document


def _hydrate_requirement(req: BRDRequirementSet) -> BRDRequirementSet:
    setattr(req, "functional", _json_load(req.functional_json, []))
    setattr(req, "non_functional", _json_load(req.non_functional_json, []))
    setattr(req, "assumptions", _json_load(req.assumptions_json, []))
    return req


def _hydrate_artifact(artifact: BRDDesignArtifact) -> BRDDesignArtifact:
    setattr(artifact, "payload", _json_load(artifact.payload_json, {}))
    return artifact


def _artifact_dict(artifact: BRDDesignArtifact) -> dict:
    hydrated = _hydrate_artifact(artifact)
    return jsonable_encoder({
        "id": hydrated.id,
        "project_id": hydrated.project_id,
        "document_id": hydrated.document_id,
        "artifact_type": hydrated.artifact_type,
        "version": hydrated.version,
        "title": hydrated.title,
        "payload": getattr(hydrated, "payload", {}),
        "ai_provider": hydrated.ai_provider,
        "model_used": hydrated.model_used,
        "created_by_id": hydrated.created_by_id,
        "created_at": hydrated.created_at,
    })


def _requirement_dict(req: BRDRequirementSet) -> dict:
    hydrated = _hydrate_requirement(req)
    return jsonable_encoder({
        "id": hydrated.id,
        "document_id": hydrated.document_id,
        "project_id": hydrated.project_id,
        "version": hydrated.version,
        "overview": hydrated.overview,
        "functional": getattr(hydrated, "functional", []),
        "non_functional": getattr(hydrated, "non_functional", []),
        "assumptions": getattr(hydrated, "assumptions", []),
        "created_by": hydrated.created_by,
        "created_at": hydrated.created_at,
    })


def _fallback_requirements(project: Project, text: str) -> dict:
    return {
        "overview": f"{project.name} delivers {project.description or 'a governed enterprise solution'} with auditable delivery checkpoints.",
        "functional": [
            "Capture project-level requirements and approval history.",
            "Track delivery tasks, blockers, assignments, and review state.",
            "Generate business flow, architecture, and database design artifacts.",
            "Produce executive reports linked to project health and risks.",
        ],
        "non_functional": ["Role-based access control", "Auditability", "Report export readiness", "RAG-ready document metadata"],
        "assumptions": ["Client stakeholders validate extracted requirements.", "ChromaDB stores embeddings only."],
        "sourceSummary": text[:600],
    }


def _fallback_artifact(project: Project, artifact_type: str, requirements: dict | None = None) -> dict:
    reqs = requirements or {}
    if artifact_type == "business_flow":
        return {
            "nodes": [
                {"id": "intake", "label": "BRD Intake"},
                {"id": "extract", "label": "Requirement Extraction"},
                {"id": "review", "label": "Stakeholder Review"},
                {"id": "design", "label": "Solution Design"},
                {"id": "delivery", "label": "Delivery Governance"},
            ],
            "edges": [
                {"source": "intake", "target": "extract"},
                {"source": "extract", "target": "review"},
                {"source": "review", "target": "design"},
                {"source": "design", "target": "delivery"},
            ],
            "requirementsUsed": reqs.get("functional", [])[:5],
        }
    if artifact_type == "architecture":
        stack = project.tech_stack.split(",") if project.tech_stack else ["React", "FastAPI", "MySQL", "ChromaDB", "Groq"]
        return {
            "layers": [
                {"name": "Experience", "components": ["Delivery dashboard", "Task tracker", "BRD Studio"]},
                {"name": "API", "components": ["FastAPI gateway", "RBAC dependencies", "Audit service"]},
                {"name": "AI", "components": ["Common LLM service", "Groq provider", "RAG service"]},
                {"name": "Data", "components": ["MySQL metadata", "ChromaDB vectors", "File storage"]},
            ],
            "techStack": stack,
            "decisions": ["Use one project ID as integration key", "Keep vectors outside MySQL", "Use one common AI gateway"],
        }
    if artifact_type == "database_design":
        return {
            "entities": [
                {"name": "projects", "fields": ["id", "account_id", "name", "health", "risk"]},
                {"name": "tasks", "fields": ["id", "project_id", "assignee_id", "status", "priority"]},
                {"name": "brd_documents", "fields": ["id", "project_id", "filename", "storage_path", "status"]},
                {"name": "brd_requirements", "fields": ["id", "document_id", "project_id", "version"]},
                {"name": "brd_design_artifacts", "fields": ["id", "project_id", "artifact_type", "version"]},
            ],
            "databaseTech": "MySQL",
        }
    return {
        "sections": [
            {"title": "Executive Summary", "content": f"{project.name} is governed through unified tasks, BRD artifacts, and delivery reports."},
            {"title": "Risk and Delivery View", "content": f"Current risk is {project.risk.value}; health is {project.health.value}."},
        ]
    }


@router.get("/documents", response_model=list[BRDDocumentOut])
def list_documents(
    project_id: str | None = None,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> list[BRDDocument]:
    stmt = select(BRDDocument).order_by(BRDDocument.uploaded_at.desc())
    if project_id:
        stmt = stmt.where(BRDDocument.project_id == project_id)
    return [_hydrate_document(document, db) for document in db.scalars(stmt).all()]


@router.post("/documents/upload", response_model=BRDDocumentOut, status_code=201)
async def upload_document(
    project_id: str = Form(...),
    document_type: str = Form("brd"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> BRDDocument:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = get_settings()
    storage_dir = resolve_app_path(str(settings.report_dir.parent / "brd" / project_id))
    storage_dir.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    document = BRDDocument(
        project_id=project_id,
        filename=file.filename or "uploaded-brd",
        document_type=document_type,
        content_type=file.content_type,
        size_bytes=len(content),
        status=BRDDocumentStatus.READY,
        uploaded_by_id=actor.id,
        extracted_text=content.decode("utf-8", errors="ignore")[:120000],
    )
    db.add(document)
    db.flush()
    target = storage_dir / f"{document.id}_{document.filename}"
    target.write_bytes(content)
    document.storage_path = str(target)
    audit(db, actor.id, "BRD Uploaded", "BRD Studio", f"BRD {document.filename} uploaded for {project.name}")
    db.commit()
    db.refresh(document)
    return _hydrate_document(document, db)


@router.get("/projects/{project_id}/requirements", response_model=list[RequirementOut])
def list_project_requirements(project_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[BRDRequirementSet]:
    reqs = db.scalars(
        select(BRDRequirementSet).where(BRDRequirementSet.project_id == project_id).order_by(BRDRequirementSet.created_at.desc())
    ).all()
    return [_hydrate_requirement(req) for req in reqs]


@router.post("/requirements", response_model=RequirementOut, status_code=201)
def save_requirements(
    payload: RequirementSave,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> BRDRequirementSet:
    if not db.get(BRDDocument, payload.document_id):
        raise HTTPException(status_code=404, detail="BRD document not found")
    latest_version = db.scalar(
        select(func.max(BRDRequirementSet.version)).where(BRDRequirementSet.document_id == payload.document_id)
    ) or 0
    req = BRDRequirementSet(
        document_id=payload.document_id,
        project_id=payload.project_id,
        version=latest_version + 1,
        overview=payload.overview,
        functional_json=_json_dump(payload.functional),
        non_functional_json=_json_dump(payload.non_functional),
        assumptions_json=_json_dump(payload.assumptions),
        created_by=payload.created_by,
    )
    db.add(req)
    audit(db, actor.id, "Requirements Saved", "BRD Studio", f"Requirements saved for document {payload.document_id}")
    db.commit()
    db.refresh(req)
    return _hydrate_requirement(req)


@router.get("/projects/{project_id}/artifacts", response_model=list[BRDArtifactOut])
def list_artifacts(
    project_id: str,
    artifact_type: str | None = None,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> list[BRDDesignArtifact]:
    stmt = select(BRDDesignArtifact).where(BRDDesignArtifact.project_id == project_id).order_by(BRDDesignArtifact.created_at.desc())
    if artifact_type:
        stmt = stmt.where(BRDDesignArtifact.artifact_type == artifact_type)
    return [_hydrate_artifact(artifact) for artifact in db.scalars(stmt).all()]


@router.get("/artifacts/{artifact_id}", response_model=BRDArtifactOut)
def get_artifact(artifact_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> BRDDesignArtifact:
    artifact = db.get(BRDDesignArtifact, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return _hydrate_artifact(artifact)


@router.post("/artifacts", response_model=BRDArtifactOut, status_code=201)
def create_artifact(
    payload: BRDArtifactCreate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> BRDDesignArtifact:
    if not db.get(Project, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    latest_version = db.scalar(
        select(func.max(BRDDesignArtifact.version)).where(
            BRDDesignArtifact.project_id == payload.project_id,
            BRDDesignArtifact.artifact_type == payload.artifact_type,
        )
    ) or 0
    artifact = BRDDesignArtifact(
        project_id=payload.project_id,
        document_id=payload.document_id,
        artifact_type=payload.artifact_type,
        version=latest_version + 1,
        title=payload.title,
        payload_json=json.dumps(payload.payload, ensure_ascii=False),
        ai_provider=payload.ai_provider,
        model_used=payload.model_used,
        created_by_id=actor.id,
    )
    db.add(artifact)
    audit(db, actor.id, "BRD Artifact Saved", "BRD Studio", f"{payload.artifact_type} saved for project {payload.project_id}")
    db.commit()
    db.refresh(artifact)
    return _hydrate_artifact(artifact)


@router.get("/documents/{document_id}/artifacts/{artifact_type}/versions", response_model=list[BRDArtifactOut])
def list_artifact_versions(
    document_id: str,
    artifact_type: str,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> list[BRDDesignArtifact]:
    artifacts = db.scalars(
        select(BRDDesignArtifact)
        .where(BRDDesignArtifact.document_id == document_id)
        .where(BRDDesignArtifact.artifact_type == artifact_type)
        .order_by(BRDDesignArtifact.version.desc())
    ).all()
    return [_hydrate_artifact(artifact) for artifact in artifacts]


@router.get("/documents/{document_id}/artifacts/{artifact_type}/compare", response_model=dict)
def compare_artifact_versions(
    document_id: str,
    artifact_type: str,
    v1: int,
    v2: int,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> dict:
    rows = db.scalars(
        select(BRDDesignArtifact)
        .where(BRDDesignArtifact.document_id == document_id)
        .where(BRDDesignArtifact.artifact_type == artifact_type)
        .where(BRDDesignArtifact.version.in_([v1, v2]))
    ).all()
    by_version = {row.version: _json_load(row.payload_json, {}) for row in rows}
    if v1 not in by_version or v2 not in by_version:
        raise HTTPException(status_code=404, detail="One or both versions not found")
    left = json.dumps(by_version[v1], sort_keys=True, indent=2)
    right = json.dumps(by_version[v2], sort_keys=True, indent=2)
    return {
        "documentId": document_id,
        "artifactType": artifact_type,
        "v1": v1,
        "v2": v2,
        "same": left == right,
        "v1Size": len(left),
        "v2Size": len(right),
    }


@router.post("/documents/{document_id}/artifacts/{artifact_type}/restore/{version}", response_model=BRDArtifactOut)
def restore_artifact_version(
    document_id: str,
    artifact_type: str,
    version: int,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> BRDDesignArtifact:
    target = db.scalar(
        select(BRDDesignArtifact)
        .where(BRDDesignArtifact.document_id == document_id)
        .where(BRDDesignArtifact.artifact_type == artifact_type)
        .where(BRDDesignArtifact.version == version)
    )
    if not target:
        raise HTTPException(status_code=404, detail="Version not found")
    payload = _json_load(target.payload_json, {})
    restored_payload = BRDArtifactCreate(
        project_id=target.project_id,
        document_id=document_id,
        artifact_type=artifact_type,
        title=f"{target.title} Restored",
        payload=payload if isinstance(payload, dict) else {"payload": payload},
        ai_provider=target.ai_provider,
        model_used=target.model_used,
    )
    return create_artifact(restored_payload, db, actor)


@router.post("/generate", response_model=dict)
def generate_brd_asset(
    payload: BRDGenerateRequest,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> dict:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    document = db.get(BRDDocument, payload.document_id) if payload.document_id else None
    doc_text = (document.extracted_text if document else "") or payload.prompt or project.description or project.name

    latest_req = db.scalar(
        select(BRDRequirementSet).where(BRDRequirementSet.project_id == project.id).order_by(BRDRequirementSet.version.desc())
    )
    latest_requirements = _hydrate_requirement(latest_req) if latest_req else None
    req_payload = {
        "overview": getattr(latest_requirements, "overview", None) if latest_requirements else None,
        "functional": getattr(latest_requirements, "functional", []) if latest_requirements else [],
        "nonFunctional": getattr(latest_requirements, "non_functional", []) if latest_requirements else [],
    }

    provider_used = "fallback"
    model_used = "deterministic"
    if payload.artifact_type == "requirements":
        result = _fallback_requirements(project, doc_text)
        try:
            text, model_used = generate_text(payload.provider, f"Extract JSON requirements for {project.name} from:\n{doc_text[:12000]}", payload.model)
            parsed = json.loads(text.strip().removeprefix("```json").removesuffix("```"))
            if isinstance(parsed, dict):
                result = {**result, **parsed}
                provider_used = payload.provider
        except Exception:
            pass
        if document:
            saved = save_requirements(
                RequirementSave(
                    document_id=document.id,
                    project_id=project.id,
                    overview=result.get("overview"),
                    functional=result.get("functional", []),
                    non_functional=result.get("nonFunctional", result.get("non_functional", [])),
                    assumptions=result.get("assumptions", []),
                    created_by=provider_used,
                ),
                db,
                actor,
            )
            return {"status": "saved", "provider": provider_used, "model": model_used, "requirements": _requirement_dict(saved)}
        return {"status": "generated", "provider": provider_used, "model": model_used, "requirements": result}

    result = _fallback_artifact(project, payload.artifact_type, req_payload)
    try:
        text, model_used = generate_text(
            payload.provider,
            f"Generate JSON {payload.artifact_type} for {project.name}. Requirements: {json.dumps(req_payload)[:10000]}",
            payload.model,
        )
        parsed = json.loads(text.strip().removeprefix("```json").removesuffix("```"))
        if isinstance(parsed, dict):
            result = parsed
            provider_used = payload.provider
    except Exception:
        pass
    created = create_artifact(
        BRDArtifactCreate(
            project_id=project.id,
            document_id=document.id if document else None,
            artifact_type="architecture" if payload.artifact_type == "executive_report" else payload.artifact_type,
            title=f"{payload.artifact_type.replace('_', ' ').title()} Generated",
            payload=result,
            ai_provider=provider_used,
            model_used=model_used,
        ),
        db,
        actor,
    )
    return {"status": "saved", "provider": provider_used, "model": model_used, "artifact": _artifact_dict(created)}


@router.post("/copilot/chat", response_model=BRDChatOut)
def copilot_chat(payload: BRDChatRequest, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> BRDChatOut:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    documents = db.scalars(select(BRDDocument).where(BRDDocument.project_id == payload.project_id)).all()
    context = "\n\n".join((document.extracted_text or document.filename)[:2500] for document in documents[:4])
    prompt = f"Project: {project.name}\nDescription: {project.description}\nContext:\n{context}\n\nQuestion: {payload.question}"
    try:
        answer, _ = generate_text(payload.provider, prompt, payload.model)
    except Exception:
        answer = (
            f"For {project.name}, the current BRD Studio context includes {len(documents)} document(s), "
            f"{project.completion_percent}% delivery completion, and {project.risk.value} project risk. "
            "Upload richer BRD text or configure Groq for deeper grounded answers."
        )
    return BRDChatOut(
        answer=answer,
        sources=[{"documentId": document.id, "filename": document.filename} for document in documents[:4]],
    )
