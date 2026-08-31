import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.readiness import IndustryReadinessRequest
from app.services.readiness.scorer import calculate_industry_readiness


client = TestClient(app)


def test_weighted_score_and_breakdown_are_consistent(highly_ready_fixture):
    result = calculate_industry_readiness(highly_ready_fixture)
    assert result.industryReadinessScore == pytest.approx(
        sum(item["weightedScore"] for item in result.breakdown.model_dump().values()), abs=0.01
    )
    assert sum(item["weight"] for item in result.breakdown.model_dump().values()) == 100
    assert result.category in {"Highly Industry Ready", "Industry Ready"}
    assert result.topRecommendations[0]["entityId"] == "rec-high"


def test_fixture_categories(medium_fixture, developing_fixture):
    medium = calculate_industry_readiness(medium_fixture)
    developing = calculate_industry_readiness(developing_fixture)
    assert 0 <= medium.industryReadinessScore <= 100
    assert medium.category in {"Developing", "Progressing", "Industry Ready"}
    assert developing.category == "Needs Development"


@pytest.mark.parametrize("score, category", [
    (0, "Needs Development"),
    (59.99, "Needs Development"),
    (60, "Developing"),
    (69.99, "Developing"),
    (70, "Progressing"),
    (79.99, "Progressing"),
    (80, "Industry Ready"),
    (89.99, "Industry Ready"),
    (90, "Highly Industry Ready"),
    (100, "Highly Industry Ready"),
])
def test_category_boundaries(score, category):
    from app.services.readiness.scorer import category_for_score

    assert category_for_score(score) == category


def test_zero_and_maximum_values_are_clamped(developing_fixture, highly_ready_fixture):
    zero = calculate_industry_readiness(developing_fixture)
    maximum = calculate_industry_readiness(highly_ready_fixture)
    assert zero.industryReadinessScore >= 0
    assert maximum.industryReadinessScore <= 100


def test_unverified_achievement_and_skill_do_not_award_points(highly_ready_fixture):
    verified = calculate_industry_readiness(highly_ready_fixture)
    fixture = dict(highly_ready_fixture)
    fixture["verifiedAchievements"] = [{"type": "verified_project", "label": "Claim", "verified": False}]
    fixture["skillProfile"] = {"skills": [{"name": "Claimed Skill", "confidence": 1, "verified": False}]}
    unverified = calculate_industry_readiness(fixture)
    assert unverified.breakdown.verifiedAchievements.score == 0
    assert unverified.breakdown.technicalSkillProfile.score == 0
    assert unverified.industryReadinessScore < verified.industryReadinessScore


def test_same_inputs_produce_same_score(highly_ready_fixture):
    first = calculate_industry_readiness(highly_ready_fixture)
    second = calculate_industry_readiness(highly_ready_fixture)
    assert first.industryReadinessScore == second.industryReadinessScore
    assert first.breakdown == second.breakdown


def test_non_verified_requests_are_rejected(highly_ready_fixture):
    invalid = dict(highly_ready_fixture)
    invalid["verificationStatus"] = "PENDING"
    with pytest.raises(ValueError):
        IndustryReadinessRequest.model_validate(invalid)


def test_unknown_request_fields_are_rejected(highly_ready_fixture):
    invalid = dict(highly_ready_fixture)
    invalid["industryReadinessScore"] = 99
    with pytest.raises(ValueError):
        IndustryReadinessRequest.model_validate(invalid)


def test_endpoint_returns_contract(highly_ready_fixture):
    response = client.post("/api/v1/evaluation/industry-readiness", json=highly_ready_fixture)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["scoringVersion"] == "1.0"
    assert set(body["data"]["breakdown"]) == {
        "portfolioQuality",
        "technicalSkillProfile",
        "githubEvidence",
        "atsReadiness",
        "verifiedAchievements",
        "careerAlignment",
    }

