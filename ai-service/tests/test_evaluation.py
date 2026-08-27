"""Tests for the portfolio evaluation endpoint /api/v1/evaluation/portfolio."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "studentId": "student_12345",
    "portfolioId": "portfolio_67890",
    "verificationStatus": "VERIFIED",
    "resume": {
        "summary": "Full-stack developer with React & Node experience",
        "education": "B.Tech Computer Science",
    },
    "projects": [
        {
            "title": "E-Commerce Platform",
            "technologies": ["React", "Node.js", "MongoDB"],
            "githubUrl": "https://github.com/example/ecommerce",
        }
    ],
    "certificates": [
        {
            "title": "AWS Certified Cloud Practitioner",
            "issuer": "Amazon Web Services",
            "issuedAt": "2025-01-15",
        }
    ],
    "github": {
        "username": "example-dev",
        "publicRepos": 12,
        "totalStars": 45,
    },
    "skills": ["JavaScript", "React", "Node.js", "Python", "FastAPI"],
}


def test_valid_evaluation_request():
    """Verify that a valid verified portfolio evaluation request returns 200 and pending contract."""
    response = client.post("/api/v1/evaluation/portfolio", json=VALID_PAYLOAD)
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert "data" in body

    data = body["data"]
    assert data["status"] == "evaluation_pending"
    assert data["portfolioScore"] is None
    assert data["atsScore"] is None
    assert data["githubScore"] is None
    assert data["industryReadinessScore"] is None
    assert isinstance(data["skills"], list)
    assert isinstance(data["skillGaps"], list)
    assert isinstance(data["recommendations"], list)


def test_missing_student_id():
    """Verify that request with missing studentId is rejected with 422."""
    payload = {**VALID_PAYLOAD}
    del payload["studentId"]

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False


def test_empty_student_id():
    """Verify that request with empty or whitespace studentId is rejected with 422."""
    payload = {**VALID_PAYLOAD, "studentId": "   "}

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False


def test_missing_portfolio_id():
    """Verify that request with missing portfolioId is rejected with 422."""
    payload = {**VALID_PAYLOAD}
    del payload["portfolioId"]

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False


def test_invalid_verification_status():
    """Verify that unverified statuses (e.g. PENDING, REJECTED) are rejected."""
    for invalid_status in ["PENDING", "REJECTED", "CHANGES_REQUESTED", "UNVERIFIED", ""]:
        payload = {**VALID_PAYLOAD, "verificationStatus": invalid_status}
        response = client.post("/api/v1/evaluation/portfolio", json=payload)
        assert response.status_code == 422, f"Expected 422 for status '{invalid_status}', got {response.status_code}"
        body = response.json()
        assert body["success"] is False


def test_malformed_projects():
    """Verify that malformed project entries (e.g., non-objects inside list) are rejected with 422."""
    payload = {
        **VALID_PAYLOAD,
        "projects": ["just a string", 12345],
    }

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False


def test_malformed_certificates():
    """Verify that malformed certificate entries (e.g., primitives instead of dicts) are rejected with 422."""
    payload = {
        **VALID_PAYLOAD,
        "certificates": ["invalid-certificate-string"],
    }

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
