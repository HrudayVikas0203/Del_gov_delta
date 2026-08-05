from fastapi import APIRouter, Depends

from app.core.security import get_current_user, require_min_role
from app.models.people import Employee, Role
from app.schemas.common import RagQueryIn, RagQueryOut
from app.services.llm import available_providers
from app.services.rag import answer_with_rag

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/providers", response_model=list[dict])
def providers(_: Employee = Depends(get_current_user)) -> list[dict]:
    return [provider.__dict__ for provider in available_providers()]


@router.post("/rag/query", response_model=RagQueryOut)
def rag_query(payload: RagQueryIn, _: Employee = Depends(require_min_role(Role.TEAM_LEAD))) -> RagQueryOut:
    return answer_with_rag(payload)
