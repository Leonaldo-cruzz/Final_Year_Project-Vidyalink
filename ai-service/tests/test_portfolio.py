from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_portfolio_response_contains_evidence_and_completeness() -> None:
    response = client.post(
        "/api/v1/portfolio/evaluate",
        json={
            "student_id": "student-1",
            "projects": [
                {
                    "title": "Verified API",
                    "description": "A documented Python API with tests.",
                    "technologies": ["Python", "FastAPI"],
                    "github_url": "https://github.com/example/api",
                    "documentation": "Installation and testing instructions.",
                    "verified": True,
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["eligible_project_count"] == 1
    assert "evidence" in body
    assert "data_completeness" in body
    assert "improvements" in body


def test_skill_extract_contract_is_available() -> None:
    response = client.post(
        "/api/v1/skills/extract",
        json={"skills": ["Python"], "projects": [{"title": "P", "description": "FastAPI service"}]},
    )
    assert response.status_code == 200
    assert response.json()["detected_skills"] == ["FastAPI", "Python"]

