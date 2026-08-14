from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "praveen.baburaya@delta.com", "password": "Demo@123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_integrated_modules_smoke() -> None:
    client = TestClient(app)
    headers = _auth_headers(client)

    projects = client.get("/api/v1/governance/projects", headers=headers)
    assert projects.status_code == 200
    project_id = projects.json()[0]["id"]

    tasks = client.get("/api/v1/tasks", headers=headers)
    assert tasks.status_code == 200
    assert len(tasks.json()) > 0

    documents = client.get(f"/api/v1/brd/documents?project_id={project_id}", headers=headers)
    assert documents.status_code == 200

    generated = client.post(
        "/api/v1/brd/generate",
        headers=headers,
        json={"project_id": project_id, "artifact_type": "business_flow", "provider": "groq"},
    )
    assert generated.status_code == 200
    assert generated.json()["status"] == "saved"

    chat = client.post(
        "/api/v1/brd/copilot/chat",
        headers=headers,
        json={"project_id": project_id, "question": "Summarize delivery risk", "provider": "groq"},
    )
    assert chat.status_code == 200
    assert chat.json()["answer"]

    email_config = client.get("/api/v1/emails/config", headers=headers)
    assert email_config.status_code == 200
    assert "smtp_configured" in email_config.json()

    scheduled = client.post(
        "/api/v1/emails",
        headers=headers,
        json={
            "recipients": ["demo.recipient@example.com"],
            "subject": "Smoke test scheduled update",
            "body": "This verifies scheduled email persistence.",
            "delivery": "schedule",
            "project_id": project_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
    )
    assert scheduled.status_code == 201
    assert scheduled.json()["status"] == "scheduled"
