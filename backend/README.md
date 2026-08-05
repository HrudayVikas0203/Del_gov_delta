# Delivery Governance Backend

Production-shaped backend for the Delivery Governance Portal.

## Stack

- FastAPI as the primary API
- Flask mounted at `/flask` for ops compatibility
- MySQL through SQLAlchemy
- ChromaDB for RAG knowledge retrieval
- Celery workers for background report/RAG jobs
- PPTX, PDF, and Excel report generation
- Env-driven LLM selection for OpenAI, Groq, Gemini, and Claude

## Run Locally

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Create a MySQL database named `delivery_governance`, update `.env`, then run:

```powershell
$env:PYTHONPATH="."
python -m app.db.seed
uvicorn app.main:app --reload --port 8000
```

Optional worker:

```powershell
$env:PYTHONPATH="."
celery -A app.workers.celery_app.celery_app worker --loglevel=info --pool=solo
```

## LLM Behavior

`GET /api/v1/ai/providers` returns every supported provider plus `configured=true/false`.
Only providers with API keys in `.env` can be used. If no provider is selected, AI and RAG generation return a controlled error.

## RBAC Model

Hierarchy:

`intern -> developer -> team_lead -> project_manager -> program_manager -> delivery_head`

Rules implemented:

- User creation: project manager and above
- Account/project creation: program manager and above
- Manual allocation: project manager, program manager, delivery head
- Project managers allocate only inside their projects
- Program managers allocate only inside their programs
- Allocator must be senior to the employee being allocated
- Active employee allocation cannot exceed 100 percent
- AI RAG query: team lead and above
- Report generation: project manager and above

## Core Endpoints

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/users`
- `GET /api/v1/governance/employees`
- `GET /api/v1/governance/accounts`
- `POST /api/v1/governance/accounts`
- `GET /api/v1/governance/projects`
- `POST /api/v1/governance/projects`
- `POST /api/v1/governance/allocations`
- `GET /api/v1/governance/status`
- `POST /api/v1/governance/status`
- `POST /api/v1/governance/rag/reindex`
- `GET /api/v1/ai/providers`
- `POST /api/v1/ai/rag/query`
- `POST /api/v1/reports`
- `GET /api/v1/reports`

## Default Seed Login

- `delivery.head@example.com`
- `ChangeMe123!`

Rotate this immediately outside local development.
