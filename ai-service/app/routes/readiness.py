"""Industry Readiness Score API."""

import os

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas.readiness import IndustryReadinessRequest, IndustryReadinessResponse
from app.services.readiness.scorer import calculate_industry_readiness

router = APIRouter(prefix="/api/v1/evaluation", tags=["Industry Readiness"])


def _authorize_internal_call(service_key: str | None) -> None:
    """Optionally require the shared internal key when one is configured."""

    expected_key = os.getenv("AI_SERVICE_API_KEY")
    if expected_key and service_key != expected_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid AI service credential")


@router.post(
    "/industry-readiness",
    response_model=IndustryReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate a deterministic Industry Readiness Score",
)
async def industry_readiness(
    payload: IndustryReadinessRequest,
    x_ai_service_key: str | None = Header(default=None),
) -> IndustryReadinessResponse:
    """Aggregate trusted, backend-generated evaluation signals."""

    _authorize_internal_call(x_ai_service_key)
    return IndustryReadinessResponse(
        success=True,
        data=calculate_industry_readiness(payload),
    )


@router.post(
    "/industry-readiness/refresh",
    response_model=IndustryReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Explicitly recalculate a deterministic Industry Readiness Score",
)
async def refresh_industry_readiness(
    payload: IndustryReadinessRequest,
    x_ai_service_key: str | None = Header(default=None),
) -> IndustryReadinessResponse:
    """Recalculate the supplied snapshot; persistence and refresh policy stay in Node."""

    _authorize_internal_call(x_ai_service_key)
    return IndustryReadinessResponse(
        success=True,
        data=calculate_industry_readiness(payload),
    )
