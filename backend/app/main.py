from fastapi import FastAPI
from flask import Flask, jsonify
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware
from app.api.v1.router import api_router

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.seed import seed
from app.db.session import Base, engine


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
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def ensure_schema() -> None:
        Base.metadata.create_all(bind=engine)
        seed()

    @app.get("/health", tags=["ops"])
    def health() -> dict:
        return {"status": "ok", "surface": "fastapi"}

    app.include_router(api_router, prefix=settings.api_prefix)
    app.mount("/flask", WSGIMiddleware(create_flask_ops_app()))
    return app


app = create_app()
