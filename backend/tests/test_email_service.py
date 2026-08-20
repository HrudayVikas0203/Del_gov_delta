from types import SimpleNamespace

from app.models.email import EmailStatus
from app.services import email as email_service


class FakeSession:
    def commit(self):
        return None

    def refresh(self, _email):
        return None


def test_task_assigned_template_contains_task_details():
    task = SimpleNamespace(
        id="task-1",
        title="Prepare status report",
        description="Collect weekly delivery updates",
        assignee=SimpleNamespace(full_name="Sanjana"),
        due_date=None,
        priority=SimpleNamespace(value="high"),
        status=SimpleNamespace(value="todo"),
    )
    subject, text, html = email_service.render_template("task_assigned", task, SimpleNamespace(full_name="Manager"))
    assert subject == "New Task Assigned to You"
    assert "Prepare status report" in text
    assert "Manager" in text
    assert html and "View Task" in html


def test_send_email_success_uses_tls_and_login(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append((host, port, timeout))

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def starttls(self):
            calls.append("tls")

        def login(self, user, password):
            calls.append(("login", user, password))

        def send_message(self, _message):
            calls.append("sent")

    monkeypatch.setattr(email_service, "smtplib", SimpleNamespace(SMTP=FakeSMTP))
    monkeypatch.setattr(email_service, "get_settings", lambda: SimpleNamespace(
        from_email=None, smtp_user="sender@example.com", smtp_password="test-password",
        smtp_host="smtp.example.com", smtp_port=587, smtp_use_tls=True,
    ))
    record = SimpleNamespace(recipients=["recipient@example.com"], subject="Test", body="Body", html_body=None, status=EmailStatus.PENDING, sent_at=None, error_message=None)
    result = email_service.send_email_record(FakeSession(), record)
    assert result.status == EmailStatus.SENT
    assert "tls" in calls and "sent" in calls


def test_send_email_failure_does_not_expose_password(monkeypatch):
    monkeypatch.setattr(email_service, "get_settings", lambda: SimpleNamespace(
        from_email=None, smtp_user=None, smtp_password=None, smtp_host="smtp.example.com",
        smtp_port=587, smtp_use_tls=True,
    ))
    record = SimpleNamespace(recipients=["recipient@example.com"], subject="Test", body="Body", html_body=None, status=EmailStatus.PENDING, sent_at=None, error_message=None)
    result = email_service.send_email_record(FakeSession(), record)
    assert result.status == EmailStatus.FAILED
    assert "password" not in (result.error_message or "").lower()
