from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from tempfile import NamedTemporaryFile

from sqlalchemy.orm import Session

from app.models.status import ReportTemplate


@contextmanager
def get_account_template_file(db: Session, account_id: str, template_id: str) -> Iterator[Path]:
    """Yield an account template path, materializing database bytes when needed."""
    template = db.get(ReportTemplate, template_id)
    if (
        template is None
        or template.account_id != account_id
        or template.project_id is not None
        or template.file_type != "pptx"
    ):
        raise ValueError("Account PPT template is unavailable. Please re-upload the account template.")

    local_path = Path(template.file_path)
    if local_path.exists():
        yield local_path
        return

    if not template.content_bytes:
        raise ValueError("Account PPT template is unavailable. Please re-upload the account template.")

    temporary_path: Path | None = None
    try:
        with NamedTemporaryFile(prefix=f"account-template-{account_id}-", suffix=".pptx", delete=False) as temporary:
            temporary.write(template.content_bytes)
            temporary_path = Path(temporary.name)
        yield temporary_path
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)