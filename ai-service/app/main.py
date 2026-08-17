import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes.evaluation import router as evaluation_router
from app.schemas.evaluation import HealthResponse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vidyalink.ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan events."""
    logger.info(
        "🚀 VidyaLink AI Service starting on host=%s port=%d (env=%s)",
        settings.AI_SERVICE_HOST,
        settings.AI_SERVICE_PORT,
        settings.AI_SERVICE_ENV,
    )
    yield
    logger.info("🛑 VidyaLink AI Service shutting down gracefully.")


app = FastAPI(
    title="VidyaLink AI Service",
    description="AI-powered Student Portfolio Verification and Evaluation Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns the current operating health of the AI microservice.",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Primary health check endpoint."""
    return HealthResponse(
        success=True,
        service="vidyalink-ai",
        status="healthy",
    )


@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def root_redirect():
    """Root endpoint info."""
    return {
        "success": True,
        "service": "vidyalink-ai",
        "version": "1.0.0",
        "docs": "/docs",
    }


# Register API versioned routers
app.include_router(evaluation_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.AI_SERVICE_HOST,
        port=settings.AI_SERVICE_PORT,
        reload=(settings.AI_SERVICE_ENV == "development"),
    )
