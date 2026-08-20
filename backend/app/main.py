import asyncio
import os
import time

from fastapi import FastAPI
from flask import Flask, jsonify
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.schema import ensure_schema_upgrades
from app.db.session import Base, engine
from app.services.email import dispatch_due_scheduled_emails


def _startup_debug_enabled() -> bool:
    return os.getenv("DB_DEBUG", "").strip().lower() == "true"


def _time_startup_step(step_name: str, operation) -> None:
    debug_enabled = _startup_debug_enabled()
    started_at = time.perf_counter()
    if debug_enabled:
        print(f"STARTUP_STEP={step_name}_BEGIN", flush=True)
    try:
        operation()
    finally:
        if debug_enabled:
            elapsed = time.perf_counter() - started_at
            print(f"STARTUP_STEP={step_name}_END elapsed={elapsed:.3f}", flush=True)


def _check_database_connection() -> None:
    with engine.connect():
        pass


def create_flask_ops_app() -> Flask:
    flask_app = Flask("delivery_governance_ops")

    @flask_app.get("/health")
    def flask_health():
        return jsonify({"status": "ok", "surface": "flask"})

    return flask_app


def create_app() -> FastAPI:
    settings = get_settings()
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
        _time_startup_step("db_connect", _check_database_connection)
        _time_startup_step("create_all", lambda: Base.metadata.create_all(bind=engine))
        _time_startup_step("schema_upgrades", ensure_schema_upgrades)

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
