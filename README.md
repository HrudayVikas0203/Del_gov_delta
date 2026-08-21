# Delivery Governance Portal

React/Vite frontend with a FastAPI backend for accounts, projects, weekly status, governance, and account-template-driven reports.

## Local development

```powershell
npm install
npm run dev
```

In another terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH="."
python -m app.db.seed
uvicorn app.main:app --reload --port 8000
```

The frontend uses `http://127.0.0.1:8000` only in development. Vercel must define:

```text
VITE_API_URL=https://del-gov-delta.onrender.com
```

This variable is public routing configuration, not a secret. API keys and database credentials belong only in the Render backend environment. See [backend/README.md](backend/README.md) for production configuration and account PPT template persistence details.
