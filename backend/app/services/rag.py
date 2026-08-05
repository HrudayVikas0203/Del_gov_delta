from fastapi import HTTPException, status

from app.rag.store import search_knowledge
from app.schemas.common import RagQueryIn, RagQueryOut
from app.services.llm import generate_text


def answer_with_rag(payload: RagQueryIn) -> RagQueryOut:
    sources = search_knowledge(payload.question, payload.top_k, payload.project_id)
    if not payload.llm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select a configured LLM provider to use AI features")
    context = "\n\n---\n\n".join(source["document"] for source in sources)
    prompt = f"""
You are a senior delivery governance analyst for an IT services organization.
Answer using only the supplied governance context. Be concise, factual, client-safe,
and call out delivery risks, blockers, ownership, and next actions when relevant.

Context:
{context}

Question:
{payload.question}
"""
    answer, model = generate_text(payload.llm.provider, prompt, payload.llm.model)
    return RagQueryOut(answer=answer, provider=payload.llm.provider, model=model, sources=sources)
