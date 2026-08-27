"""Portfolio evaluation API route."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.evaluation import (
    PortfolioEvaluationRequest,
    PortfolioEvaluationResponse,
    PortfolioScoreResponse,
)
from app.services.evaluation_service import (
    validate_evaluation_request,
    queue_evaluation,
)
from app.services.scoring import evaluate_portfolio_score

router = APIRouter(prefix="/api/v1/evaluation", tags=["Evaluation"])


@router.post(
    "/portfolio",
    response_model=PortfolioEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate verified portfolio data (job queue placeholder)",
    description="Accepts verified student portfolio data and queues it for AI evaluation.",
)
async def evaluate_portfolio(
    payload: PortfolioEvaluationRequest,
) -> PortfolioEvaluationResponse:
    """Handle verified portfolio evaluation queue requests."""
    if not validate_evaluation_request(payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio data is invalid or not in VERIFIED status",
        )

    result_data = queue_evaluation(payload)
    return PortfolioEvaluationResponse(success=True, data=result_data)


@router.post(
    "/portfolio/score",
    response_model=PortfolioScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deterministic portfolio score with dimensional breakdown",
    description="Evaluates verified student portfolio metadata across 6 weighted dimensions.",
)
async def score_portfolio(
    payload: PortfolioEvaluationRequest,
) -> PortfolioScoreResponse:
    """Execute complete deterministic evaluation of a verified student portfolio."""
    if not validate_evaluation_request(payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio data is invalid or not in VERIFIED status",
        )

    score_result = evaluate_portfolio_score(payload.model_dump())
    return PortfolioScoreResponse(success=True, data=score_result)
