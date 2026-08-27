"""Evaluation service — validation and queue management stubs."""

from typing import Any, Dict


def validate_evaluation_request(payload: Any) -> bool:
    """Validate that the evaluation request is eligible for processing."""
    if not payload:
        return False
    verification_status = getattr(payload, "verificationStatus", None)
    student_id = getattr(payload, "studentId", None)
    portfolio_id = getattr(payload, "portfolioId", None)
    return (
        isinstance(student_id, str)
        and student_id.strip() != ""
        and isinstance(portfolio_id, str)
        and portfolio_id.strip() != ""
        and verification_status == "VERIFIED"
    )


def queue_evaluation(payload: Any) -> Dict[str, Any]:
    """Queue a portfolio evaluation for processing (stub — returns pending state)."""
    return {
        "status": "evaluation_pending",
        "portfolioScore": None,
        "atsScore": None,
        "githubScore": None,
        "industryReadinessScore": None,
        "skills": [],
        "skillGaps": [],
        "recommendations": [],
    }
