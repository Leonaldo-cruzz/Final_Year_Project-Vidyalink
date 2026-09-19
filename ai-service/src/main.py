"""FastAPI entrypoint for the VIDYALINK AI service."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.config import get_settings
from src.routes import ats, github, health, portfolio, recommendations, skills

logger = logging.getLogger("vidyalink-ai-service")
settings = get_settings()

app = FastAPI(
    title="VIDYALINK AI Service",
    description="Explainable, deterministic portfolio and career-readiness analytics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(portfolio.router)
app.include_router(ats.router)
app.include_router(github.router)
app.include_router(recommendations.router)
app.include_router(skills.router)


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {"service": "vidyalink-ai-service", "docs": "/docs", "health": "/health"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = "not_found" if exc.status_code == 404 else "http_error"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(exc.detail)}},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled AI service error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred.",
            }
        },
    )
