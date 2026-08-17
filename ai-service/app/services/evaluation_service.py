import logging
from typing import List

from app.schemas.evaluation import (
    EvaluationResultData,
    PortfolioEvaluationRequest,
    PortfolioEvaluationResponse,
)

logger = logging.getLogger("vidyalink.ai.evaluation_service")


class EvaluationService:
    """Service layer handling student portfolio AI evaluation requests."""

    def evaluate_portfolio(self, request: PortfolioEvaluationRequest) -> PortfolioEvaluationResponse:
        """
        Process the evaluation request contract for a verified student portfolio.
        
        Note: Currently establishes the foundation contract and returns a standardized
        placeholder evaluation data structure with status 'evaluation_pending'.
        Full scoring models (ATS, GitHub, readiness) will be integrated in subsequent phases.
        """
        # Deduplicate and normalize skills passed in request and extracted from verified assets
        aggregated_skills: List[str] = list(
            dict.fromkeys(
                [skill.strip() for skill in request.skills if skill and skill.strip()]
                + [tech.strip() for p in request.projects for tech in p.technologies if tech and tech.strip()]
                + [skill.strip() for c in request.certificates for skill in c.skills if skill and skill.strip()]
            )
        )

        logger.info(
            "Received evaluation request for studentId=%s portfolioId=%s (projects=%d, certificates=%d, skills=%d)",
            request.studentId,
            request.portfolioId,
            len(request.projects),
            len(request.certificates),
            len(aggregated_skills),
        )

        result_data = EvaluationResultData(
            portfolioScore=None,
            atsScore=None,
            githubScore=None,
            industryReadinessScore=None,
            skills=aggregated_skills,
            recommendations=[],
            status="evaluation_pending",
        )

        return PortfolioEvaluationResponse(
            success=True,
            data=result_data,
        )


evaluation_service = EvaluationService()
