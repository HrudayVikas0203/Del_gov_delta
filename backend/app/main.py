import asyncio

from fastapi import FastAPI
from flask import Flask, jsonify
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings, log_database_diagnostics
from app.db.schema import ensure_schema_upgrades
from app.db.seed import seed
from app.db.session import Base, engine
from app.services.email import dispatch_due_scheduled_emails


def create_flask_ops_app() -> Flask:
    flask_app = Flask("delivery_governance_ops")

    @flask_app.get("/health")
    def flask_health():
        return jsonify({"status": "ok", "surface": "flask"})

    return flask_app


def create_app() -> FastAPI:
    settings = get_settings()
    log_database_diagnostics(settings)
    app = FastAPI(title=settings.app_name, version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def ensure_schema() -> None:
        Base.metadata.create_all(bind=engine)
        ensure_schema_upgrades()
        seed()

    @app.on_event("startup")
    async def start_email_dispatcher() -> None:
        async def dispatch_loop() -> None:
            while True:
                try:
                    dispatch_due_scheduled_emails()
                except Exception:
                    pass
                await asyncio.sleep(30)

        app.state.email_dispatch_task = asyncio.create_task(dispatch_loop())

    @app.on_event("shutdown")
    async def stop_email_dispatcher() -> None:
        task = getattr(app.state, "email_dispatch_task", None)
        if task:
            task.cancel()

    @app.get("/health", tags=["ops"])
    def health() -> dict:
        return {"status": "ok", "surface": "fastapi"}

    app.include_router(api_router, prefix=settings.api_prefix)
    app.mount("/flask", WSGIMiddleware(create_flask_ops_app()))
    return app


app = create_app()
