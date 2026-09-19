from src.models.scoring import ReadinessRequest
from src.services.readiness import calculate_readiness


def test_readiness_is_deterministic_and_distinguishes_missing_evidence() -> None:
    request = ReadinessRequest(portfolio_score=80, ats_score=70, skills_coverage=60)
    first = calculate_readiness(request)
    second = calculate_readiness(request)
    assert first.model_dump() == second.model_dump()
    assert first.readiness_score == 72.0
    assert first.evidence_status == "sufficient"
    assert first.component_scores["github_activity"] is None
    assert any("github activity" in gap.lower() and "not treated as a low score" in gap for gap in first.gaps)


def test_readiness_with_no_evidence_is_not_presented_as_low_performance() -> None:
    result = calculate_readiness(ReadinessRequest())
    assert result.readiness_score == 0
    assert result.level == "Insufficient Evidence"
    assert result.evidence_status == "insufficient_evidence"
