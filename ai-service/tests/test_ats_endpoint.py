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

Education
Bachelor of Technology - Computer Science
IIT Bombay | Graduated: 2022
"""


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
    body = response.json()
    assert body["success"] is True
    assert "data" in body
    assert "atsScore" in body["data"]
    assert "breakdown" in body["data"]


def test_missing_student_id_returns_422():
    response = client.post("/api/v1/evaluation/resume/ats", json={
        "portfolioId": "p123",
        "verificationStatus": "VERIFIED",
        "resume": {"text": "Some text"},
    })
    assert response.status_code == 422


def test_unverified_status_rejected_400():
    response = client.post("/api/v1/evaluation/resume/ats", json={
        "studentId": "s123",
        "portfolioId": "p123",
        "verificationStatus": "PENDING",
        "resume": {"text": "Some text"},
    })
    assert response.status_code in (400, 422)
