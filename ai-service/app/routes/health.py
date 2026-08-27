"""Health check route."""

from typing import Any, Dict
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=Dict[str, Any])
async def get_health() -> Dict[str, Any]:
    """Return the health status of the VidyaLink AI microservice.

    No internal paths, credentials, or API keys are exposed.
    """
    return {
        "success": True,
        "service": "vidyalink-ai",
        "status": "healthy",
    }
