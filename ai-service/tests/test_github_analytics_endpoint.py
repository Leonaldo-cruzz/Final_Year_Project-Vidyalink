"""Tests for POST /api/v1/evaluation/github/analyze FastAPI endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_analyze_github_valid_payload():
    payload = {
        "studentId": "student-123",
        "portfolioId": "portfolio-456",
        "github": {
            "repositoryCount": 8,
            "activeRepositoryCount": 5,
            "totalStars": 25,
            "totalForks": 6,
            "languages": ["Python", "TypeScript", "Go"],
            "commitCount": 150,
            "recentCommitCount": 45,
            "contributionActivity": {"publicRepos": 8, "followers": 12},
            "readmeCoverage": 87.5,
            "documentationCoverage": 87.5,
        },
    }

    response = client.post("/api/v1/evaluation/github/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] == "analyzed"
    assert data["analyticsVersion"] == "1.0"
    assert "metrics" in data
    assert data["metrics"]["repositoryCount"] == 8
    assert data["metrics"]["totalStars"] == 25
    assert len(data["observations"]) > 0
    assert any("8 public repositories" in obs for obs in data["observations"])
    assert any("25 stargazers" in obs for obs in data["observations"])


def test_analyze_github_empty_repos():
    payload = {
        "studentId": "student-empty",
        "portfolioId": "portfolio-empty",
        "github": {
            "repositoryCount": 0,
            "activeRepositoryCount": 0,
            "totalStars": 0,
            "totalForks": 0,
            "languages": [],
            "readmeCoverage": 0.0,
        },
    }

    response = client.post("/api/v1/evaluation/github/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["metrics"]["repositoryCount"] == 0
    assert any("No public repositories" in obs for obs in data["observations"])


def test_analyze_github_missing_student_id():
    payload = {
        "portfolioId": "portfolio-456",
        "github": {
            "repositoryCount": 5,
        },
    }

    response = client.post("/api/v1/evaluation/github/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_github_missing_portfolio_id():
    payload = {
        "studentId": "student-123",
        "github": {
            "repositoryCount": 5,
        },
    }

    response = client.post("/api/v1/evaluation/github/analyze", json=payload)
    assert response.status_code == 422
