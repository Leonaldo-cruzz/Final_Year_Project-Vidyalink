"""API integration tests for the /api/v1/evaluation/portfolio/score endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_SCORING_PAYLOAD = {
    "studentId": "student_test_123",
    "portfolioId": "portfolio_test_456",
    "verificationStatus": "VERIFIED",
    "resume": {
        "summary": "Full-stack developer with React & Node.js skills",
    },
    "projects": [
        {
            "title": "Study Platform",
            "description": "Collaborative learning management system with real-time sockets.",
            "detailedDescription": "React frontend, Express backend, MongoDB persistence, and Dockerized deployment.",
            "technologies": ["React", "Node.js", "Express", "MongoDB", "Docker", "JWT"],
            "githubRepository": "https://github.com/test/study-platform",
            "liveDeployment": "https://study.example.com",
            "documentation": {
                "readme": "Installation and setup instructions.",
                "apiDocumentation": "Endpoints overview.",
            },
            "codeQuality": {
                "testStatus": "PASSED",
                "hasTests": True,
                "coveragePercentage": 75.0,
                "lintStatus": "PASSED",
            },
        }
    ],
    "certificates": [
        {
            "title": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "issueDate": "2025-01-15",
        }
    ],
    "github": {
        "repositoryCount": 8,
        "commitCount": 120,
        "languages": ["JavaScript", "Python"],
        "stars": 8,
        "forks": 2,
        "readmePresent": True,
        "lastActivity": "2026-08-20T00:00:00Z",
    },
    "skills": ["JavaScript", "React", "Node.js", "Python", "MongoDB", "Docker"],
}


def test_score_endpoint_success():
    """Verify that POST /api/v1/evaluation/portfolio/score returns 200 with structured score data."""
    response = client.post("/api/v1/evaluation/portfolio/score", json=VALID_SCORING_PAYLOAD)
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert "data" in body

    data = body["data"]
    assert "portfolioScore" in data
    assert 0.0 <= data["portfolioScore"] <= 100.0
    assert "category" in data
    assert data["version"] == "1.0"
    assert "evaluatedAt" in data

    breakdown = data["breakdown"]
    for dimension in [
        "projectComplexity",
        "technologyStack",
        "githubActivity",
        "documentationQuality",
        "innovation",
        "codeQuality",
    ]:
        assert dimension in breakdown
        dim = breakdown[dimension]
        assert "score" in dim
        assert "weight" in dim
        assert "weightedScore" in dim
        assert "evidence" in dim
        assert "explanation" in dim


def test_score_endpoint_rejects_unverified():
    """Verify that unverified requests (verificationStatus != VERIFIED) are rejected with 422."""
    unverified_payload = {
        **VALID_SCORING_PAYLOAD,
        "verificationStatus": "PENDING",
    }
    response = client.post("/api/v1/evaluation/portfolio/score", json=unverified_payload)
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_score_endpoint_rejects_missing_student_id():
    """Verify that missing studentId returns 422."""
    payload = {**VALID_SCORING_PAYLOAD}
    del payload["studentId"]
    response = client.post("/api/v1/evaluation/portfolio/score", json=payload)
    assert response.status_code == 422


def test_score_endpoint_rejects_missing_portfolio_id():
    """Verify that missing portfolioId returns 422."""
    payload = {**VALID_SCORING_PAYLOAD}
    del payload["portfolioId"]
    response = client.post("/api/v1/evaluation/portfolio/score", json=payload)
    assert response.status_code == 422
