"""Industry readiness scoring from supplied evidence."""

from src.models.scoring import ReadinessRequest, ReadinessResponse
from src.services.portfolio_scoring import evaluate_portfolio
from src.utils.scoring import category_for_score, rounded, weighted_average


READINESS_WEIGHTS = {
    "portfolio": 0.35,
    "ats": 0.20,
    "skills_coverage": 0.20,
    "github_activity": 0.15,
    "verification_completeness": 0.10,
}


def calculate_readiness(request: ReadinessRequest) -> ReadinessResponse:
    component_scores: dict[str, float | None] = {
        "portfolio": request.portfolio_score,
        "ats": request.ats_score,
        "skills_coverage": request.skills_coverage,
        "github_activity": request.github_activity_score,
        "verification_completeness": request.verification_completeness,
    }
    if component_scores["portfolio"] is None and request.portfolio is not None:
        component_scores["portfolio"] = evaluate_portfolio(request.portfolio).overall_score

    supplied = {key: value for key, value in component_scores.items() if value is not None}
    score = rounded(weighted_average(supplied, READINESS_WEIGHTS))
    if not supplied:
        evidence_status = "insufficient_evidence"
    elif len(supplied) < 3:
        evidence_status = "partial_evidence"
    else:
        evidence_status = "sufficient"

    strengths = [
        f"{key.replace('_', ' ').title()} is supported by supplied evidence ({value:.0f}/100)."
        for key, value in supplied.items()
        if value >= 70
    ]
    gaps: list[str] = []
    next_steps: list[str] = []
    for key, value in component_scores.items():
        label = key.replace("_", " ")
        if value is None:
            gaps.append(f"No evidence supplied for {label}; this is not treated as a low score.")
            next_steps.append(f"Supply verified evidence for {label} when available.")
        elif value < 70:
            gaps.append(f"{label.title()} is currently {value:.0f}/100 based on supplied evidence.")
            next_steps.append(f"Improve {label} with specific, verifiable evidence and measurable outcomes.")

    level = "Insufficient Evidence" if not supplied else category_for_score(score)
    return ReadinessResponse(
        readiness_score=score,
        category=level,
        level=level,
        component_scores=component_scores,
        strengths=strengths,
        gaps=gaps,
        next_steps=next_steps,
        recommended_next_steps=next_steps,
        evidence_status=evidence_status,
    )
