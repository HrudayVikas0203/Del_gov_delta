from sqlalchemy import inspect, text

from app.db.session import engine


MYSQL_COLUMNS: dict[str, dict[str, str]] = {
    "tasks": {
        "tags": "JSON NULL",
        "checklist": "JSON NULL",
        "rejection_reason": "TEXT NULL",
        "submitted_for_review_at": "DATETIME NULL",
        "approved_at": "DATETIME NULL",
    },
    "brd_documents": {
        "storage_path": "VARCHAR(512) NULL",
        "error_message": "TEXT NULL",
    },
    "report_templates": {
        "filename": "VARCHAR(255) NULL",
        "content_type": "VARCHAR(120) NULL",
        "size_bytes": "INTEGER NULL",
        "content_bytes": "MEDIUMBLOB NULL",
        "content_sha256": "VARCHAR(64) NULL",
        "is_active": "BOOLEAN NOT NULL DEFAULT TRUE",
        "updated_at": "DATETIME NULL",
        "account_id": "VARCHAR(36) NULL",
        "project_id": "VARCHAR(36) NULL",
    },
    "scheduled_emails": {
        "html_body": "TEXT NULL",
    },
    "generated_reports": {
        "llm_provider": "VARCHAR(40) NULL",
        "llm_model": "VARCHAR(120) NULL",
        "filename": "VARCHAR(255) NULL",
        "content_type": "VARCHAR(120) NULL",
        "size_bytes": "INTEGER NULL",
        "content_bytes": "LONGBLOB NULL",
    },
}

SQLITE_COLUMNS: dict[str, dict[str, str]] = {
    "tasks": {
        "tags": "JSON NOT NULL DEFAULT '[]'",
        "checklist": "JSON NOT NULL DEFAULT '[]'",
        "rejection_reason": "TEXT NULL",
        "submitted_for_review_at": "DATETIME NULL",
        "approved_at": "DATETIME NULL",
    },
    "brd_documents": {
        "storage_path": "VARCHAR(512) NULL",
        "error_message": "TEXT NULL",
    },
    "report_templates": {
        "filename": "VARCHAR(255) NULL",
        "content_type": "VARCHAR(120) NULL",
        "size_bytes": "INTEGER NULL",
        "content_bytes": "BLOB NULL",
        "content_sha256": "VARCHAR(64) NULL",
        "is_active": "BOOLEAN NOT NULL DEFAULT 1",
        "updated_at": "DATETIME NULL",
        "account_id": "VARCHAR(36) NULL",
        "project_id": "VARCHAR(36) NULL",
    },
    "scheduled_emails": {
        "html_body": "TEXT NULL",
    },
    "generated_reports": {
        "llm_provider": "VARCHAR(40) NULL",
        "llm_model": "VARCHAR(120) NULL",
        "filename": "VARCHAR(255) NULL",
        "content_type": "VARCHAR(120) NULL",
        "size_bytes": "INTEGER NULL",
        "content_bytes": "BLOB NULL",
    },
}


def ensure_schema_upgrades() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    dialect = engine.dialect.name
    column_specs = SQLITE_COLUMNS if dialect == "sqlite" else MYSQL_COLUMNS

    with engine.begin() as conn:
        for table_name, columns in column_specs.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))
