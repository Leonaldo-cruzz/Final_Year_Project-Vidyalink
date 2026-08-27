"""VidyaLink AI Microservice — FastAPI Application Entry Point."""

from fastapi import FastAPI
from app.routes.evaluation import router as evaluation_router

app = FastAPI(
    title="VidyaLink AI Service",
    description="AI-powered evaluation microservice for student portfolio verification.",
    version="1.0.0",
)

app.include_router(evaluation_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Service health check endpoint."""
    return {"status": "ok", "service": "vidyalink-ai"}
