from fastapi import APIRouter

from src.models.portfolio import PortfolioSubmission, SkillExtractionResponse
from src.models.scoring import (
    DeploymentVerificationRequest,
    DeploymentVerificationResponse,
    PortfolioEvaluation,
    ReadinessRequest,
    ReadinessResponse,
)
from src.services.deployment_verification import verify_deployment
from src.services.portfolio_scoring import evaluate_portfolio
from src.services.readiness import calculate_readiness
from src.services.skill_analysis import extract_skills

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


@router.post("/evaluate", response_model=PortfolioEvaluation)
def evaluate_portfolio_route(payload: PortfolioSubmission) -> PortfolioEvaluation:
    return evaluate_portfolio(payload)


@router.post("/verify-deployment", response_model=DeploymentVerificationResponse)
def verify_deployment_route(payload: DeploymentVerificationRequest) -> DeploymentVerificationResponse:
    return verify_deployment(payload.url)


@router.post("/skills", response_model=SkillExtractionResponse)
def extract_portfolio_skills(payload: PortfolioSubmission) -> SkillExtractionResponse:
    return SkillExtractionResponse(**extract_skills(payload))


@router.post("/readiness", response_model=ReadinessResponse)
def portfolio_readiness(payload: ReadinessRequest) -> ReadinessResponse:
    return calculate_readiness(payload)

