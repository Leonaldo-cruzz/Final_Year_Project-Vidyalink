from fastapi.testclient import TestClient

from src.main import app
from src.models.portfolio import PortfolioSubmission
from src.services.skill_analysis import extract_skills, skill_gap


client = TestClient(app)


def test_skill_extraction_uses_only_controlled_vocabulary() -> None:
    portfolio = PortfolioSubmission(
        skills=["Python", "ImaginarySkill"],
        projects=[{"title": "P", "description": "Built a FastAPI service with PostgreSQL."}],
        resume="Worked with Python and an invented framework.",
    )
    result = extract_skills(portfolio)
    assert "Python" in result["detected_skills"]
    assert "FastAPI" in result["detected_skills"]
    assert "PostgreSQL" in result["detected_skills"]
    assert "ImaginarySkill" not in result["detected_skills"]
    assert "invented framework" not in result["detected_skills"]


def test_skill_gap_calculation() -> None:
    result = skill_gap(["Python", "Git"], "backend developer", [])
    assert result.matched_skills == ["Git", "Python"]
    assert "SQL" in result.missing_skills
    assert result.coverage_percentage == 50.0


def test_skill_endpoint_returns_sources() -> None:
    response = client.post(
        "/api/v1/portfolio/skills",
        json={"skills": ["React"], "projects": [{"title": "UI", "technologies": ["JavaScript"]}]},
    )
    assert response.status_code == 200
    assert response.json()["skill_sources"]["React"] == ["profile.skills"]
