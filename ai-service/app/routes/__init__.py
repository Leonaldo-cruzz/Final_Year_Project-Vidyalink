"""Routes package."""

from app.routes.health import router as health_router
from app.routes.evaluation import router as evaluation_router

__all__ = ["health_router", "evaluation_router"]
