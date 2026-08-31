"""VidyaLink AI microservice entry point.

The readiness endpoint receives a server-built snapshot. It does not accept
browser-provided scores or make an LLM hiring decision.
"""

from fastapi import FastAPI

from app.routes.readiness import router as readiness_router
from app.services.readiness.config import SCORING_VERSION

app = FastAPI(
    title="VidyaLink AI Service",
    description="Deterministic evaluation aggregation for VidyaLink.",
    version=SCORING_VERSION,
)

app.include_router(readiness_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "vidyalink-ai",
        "scoringVersion": SCORING_VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

