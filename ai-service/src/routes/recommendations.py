from fastapi import APIRouter

from src.middleware.internal_auth import require_internal_key
from src.models.portfolio import RecommendationsRequest
from src.models.scoring import RecommendationsResponse
from src.services.recommendation_engine import recommend

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationsResponse, dependencies=[require_internal_key])
def recommendations(payload: RecommendationsRequest) -> RecommendationsResponse:
    return recommend(payload)

