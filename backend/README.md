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

## Render Deployment

Configure the Render web service with `backend` as its root directory:

```text
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

Set `DATABASE_URL`, `SECRET_KEY`, `BACKEND_CORS_ORIGINS`, and `CORS_ORIGIN_REGEX` in Render. The production frontend should set `VITE_API_URL=https://del-gov-delta.onrender.com` (or use the repository Vercel rewrite). Keep `SMTP_USER` and `SMTP_PASSWORD` configured only on Render; never add them to frontend environment variables.

Verify the deployment with:

```bash
curl https://del-gov-delta.onrender.com/health
curl -i https://del-gov-delta.onrender.com/api/v1/tasks
```

The tasks request should return `401` without a bearer token, which confirms the real route is reachable. After signing in, use the returned bearer token for task and email API calls. Send-now email uses `POST /api/v1/emails` with `delivery: "send_now"`; scheduled email uses the same endpoint with `delivery: "schedule"` and a future `scheduled_at`, then the backend dispatcher processes it.

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
