"""Integration tests for POST /api/v1/evaluation/resume/ats endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

STRONG_RESUME_TEXT = """
John Doe | john.doe@email.com | +1-555-123-4567 | github.com/johndoe

Summary
Full-stack Software Engineer with 3 years of experience developing scalable REST APIs using Node.js, React, PostgreSQL, and AWS.

Skills
Languages: Python, JavaScript, TypeScript, Go
Frameworks: React, Next.js, Node.js, Express, FastAPI
Databases: PostgreSQL, MongoDB, Redis
Cloud & DevOps: AWS, Docker, Kubernetes, GitHub Actions, CI/CD
Tools: Git, Jest, Pytest

Experience
Software Engineer - TechCorp
Jan 2023 - Present
- Developed 15+ RESTful API endpoints using Node.js reducing latency by 40%
- Architected microservices handling 50k+ daily requests
- Implemented CI/CD pipeline reducing deployment time by 60%

Backend Intern - StartupXYZ
Jun 2022 - Dec 2022
- Built REST API using Django and PostgreSQL
- Optimized queries reducing load time by 35%

Projects
VidyaLink AI Platform (github.com/johndoe/vidyalink)
- Engineered full-stack platform using React, Node.js, FastAPI, MongoDB, AWS

Education
Bachelor of Technology - Computer Science
IIT Bombay | Graduated: 2022
"""


# ---------------------------------------------------------------------------
# Validation error tests
# ---------------------------------------------------------------------------

def test_missing_student_id_returns_422():
    response = client.post("/api/v1/evaluation/resume/ats", json={
        "portfolioId": "p123",
        "verificationStatus": "VERIFIED",
        "resume": {"text": "Some resume text"},
    })
    assert response.status_code == 422


def test_missing_portfolio_id_returns_422():
    response = client.post("/api/v1/evaluation/resume/ats", json={
        "studentId": "s123",
        "verificationStatus": "VERIFIED",
        "resume": {"text": "Some resume text"},
    })
    assert response.status_code == 422


def test_unverified_status_rejected_400():
    response = client.post("/api/v1/evaluation/resume/ats", json={
        "studentId": "s123",
        "portfolioId": "p123",
        "verificationStatus": "PENDING",
        "resume": {"text": "Some resume text"},
    })
    assert response.status_code in (400, 422)


def test_missing_body_returns_422():
    response = client.post("/api/v1/evaluation/resume/ats", json={})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Success response tests
# ---------------------------------------------------------------------------

def _valid_request(text="", target_job=None):
    body = {
        "studentId": "student-abc-123",
        "portfolioId": "portfolio-xyz-456",
        "verificationStatus": "VERIFIED",
        "resume": {"text": text},
    }
    if target_job:
        body["targetJob"] = target_job
    return client.post("/api/v1/evaluation/resume/ats", json=body)


def test_valid_request_returns_200():
    response = _valid_request(STRONG_RESUME_TEXT)
    assert response.status_code == 200


def test_response_structure():
    response = _valid_request(STRONG_RESUME_TEXT)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    data = body["data"]
    assert "atsScore" in data
    assert "category" in data
    assert "breakdown" in data
    assert "recommendations" in data
    assert "scoringVersion" in data
    assert "evaluatedAt" in data


def test_all_5_breakdown_dimensions_present():
    response = _valid_request(STRONG_RESUME_TEXT)
    breakdown = response.json()["data"]["breakdown"]
    assert "keywordMatching" in breakdown
    assert "formatting" in breakdown
    assert "technicalSkills" in breakdown
    assert "experience" in breakdown
    assert "education" in breakdown


def test_ats_score_within_range():
    response = _valid_request(STRONG_RESUME_TEXT)
    score = response.json()["data"]["atsScore"]
    assert 0.0 <= score <= 100.0


def test_scoring_version_stamped():
    response = _valid_request(STRONG_RESUME_TEXT)
    assert response.json()["data"]["scoringVersion"] == "1.0"


def test_empty_resume_text_still_succeeds():
    """Empty resume should return 200 with low score, not a 500."""
    response = _valid_request("")
    assert response.status_code == 200
    score = response.json()["data"]["atsScore"]
    assert 0.0 <= score <= 100.0


def test_with_target_job_returns_200():
    target_job = {
        "title": "Backend Engineer",
        "requiredSkills": ["python", "fastapi", "postgresql"],
        "preferredSkills": ["docker", "aws"],
    }
    response = _valid_request(STRONG_RESUME_TEXT, target_job)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "matchedSkills" in data
    assert "missingSkills" in data
    assert "missingKeywords" in data


def test_each_breakdown_dimension_has_required_fields():
    response = _valid_request(STRONG_RESUME_TEXT)
    breakdown = response.json()["data"]["breakdown"]
    for dim_name, dim_data in breakdown.items():
        assert "score" in dim_data, f"Missing 'score' in dimension '{dim_name}'"
        assert "weight" in dim_data, f"Missing 'weight' in dimension '{dim_name}'"
        assert "weightedScore" in dim_data, f"Missing 'weightedScore' in dimension '{dim_name}'"
        assert "evidence" in dim_data, f"Missing 'evidence' in dimension '{dim_name}'"
        assert "explanation" in dim_data, f"Missing 'explanation' in dimension '{dim_name}'"
        assert isinstance(dim_data["evidence"], list)


def test_dimension_weights_correct():
    response = _valid_request(STRONG_RESUME_TEXT)
    breakdown = response.json()["data"]["breakdown"]
    assert breakdown["keywordMatching"]["weight"] == 30
    assert breakdown["technicalSkills"]["weight"] == 25
    assert breakdown["formatting"]["weight"] == 20
    assert breakdown["experience"]["weight"] == 15
    assert breakdown["education"]["weight"] == 10


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["status"] == "healthy"
