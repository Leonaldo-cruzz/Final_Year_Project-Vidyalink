from fastapi import APIRouter, status

from app.schemas.evaluation import (
    PortfolioEvaluationRequest,
    PortfolioEvaluationResponse,
)
from app.services.evaluation_service import evaluation_service

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.post(
    "/portfolio",
    response_model=PortfolioEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate student verified portfolio",
    description="Accepts verified portfolio data and returns standard evaluation contract response.",
)
async def evaluate_portfolio(
    request: PortfolioEvaluationRequest,
) -> PortfolioEvaluationResponse:
    """Evaluate student verified portfolio assets against industry benchmarks."""
    return evaluation_service.evaluate_portfolio(request)
