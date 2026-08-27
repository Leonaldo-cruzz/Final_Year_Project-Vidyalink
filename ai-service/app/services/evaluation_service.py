"""Evaluation service module handling portfolio evaluation preparation and validation."""

import logging
from app.schemas.evaluation import (
    PortfolioEvaluationRequest,
    EvaluationResultData,
)

logger = logging.getLogger("ai_service.evaluation")


def validate_evaluation_request(request: PortfolioEvaluationRequest) -> bool:
    """Validate that the incoming request strictly satisfies evaluation eligibility criteria."""
    if not request.studentId or not request.studentId.strip():
        return False
    if not request.portfolioId or not request.portfolioId.strip():
        return False
    if request.verificationStatus != "VERIFIED":
        return False
    return True


def queue_evaluation(request: PortfolioEvaluationRequest) -> EvaluationResultData:
    """Prepare and structure the evaluation job response without fake score computation."""
    logger.info(
        "Evaluation job queued for student_id=%s, portfolio_id=%s, projects_count=%d, certificates_count=%d",
        request.studentId,
        request.portfolioId,
        len(request.projects),
        len(request.certificates),
    )

    return EvaluationResultData(
        status="evaluation_pending",
        portfolioScore=None,
        atsScore=None,
        githubScore=None,
        industryReadinessScore=None,
        skills=[],
        skillGaps=[],
        recommendations=[],
    )
