"""Integration and gate tests for VIDYALINK AI Service (Task 9)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from src.models.portfolio import PortfolioSubmission, Project
from src.services.portfolio_scoring import PORTFOLIO_WEIGHTS, evaluate_portfolio

client = TestClient(app)


def test_app_main_entrypoint_health() -> None:
    """Verifies that app.main entrypoint correctly serves /health without auth."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "vidyalink-ai"


def test_canonical_weights_invariants() -> None:
    """Verifies the canonical 6-dimension scoring formula weights."""
    expected_weights = {
        "complexity": 0.25,
        "technology_stack": 0.20,
        "github_activity": 0.15,
        "documentation_quality": 0.15,
        "innovation": 0.15,
        "code_quality": 0.10,
    }
    assert PORTFOLIO_WEIGHTS == expected_weights
    assert sum(PORTFOLIO_WEIGHTS.values()) == pytest.approx(1.0)


def test_deterministic_repeated_runs_multi_trial() -> None:
    """Identical input evaluated across 10 consecutive trials produces strictly identical output."""
    payload = {
        "student_id": "test-student-deterministic",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "projects": [
            {
                "title": "Cloud Microservice",
                "description": "High-throughput API backend with automated unit testing and CI/CD pipelines.",
                "technologies": ["Python", "FastAPI", "Docker", "PostgreSQL"],
                "github_url": "https://github.com/vidyalink/cloud-service",
                "demo_url": "https://service.vidyalink.demo",
                "documentation": "Full architecture documentation, Swagger reference, and benchmark reports.",
                "complexity_indicators": ["database", "scalable", "pipeline"],
                "innovation_indicators": ["optimization", "automation"],
                "code_quality_indicators": ["clean code", "testing", "ci"],
                "verified": True,
            }
        ],
    }

    first_result = client.post("/api/v1/portfolio/evaluate", json=payload).json()
    for _ in range(10):
        next_result = client.post("/api/v1/portfolio/evaluate", json=payload).json()
        assert next_result == first_result


def test_unverified_data_gate_strict() -> None:
    """Unverified projects must NOT enter trusted evaluation."""
    payload = {
        "student_id": "student-unverified-only",
        "skills": ["JavaScript", "React"],
        "projects": [
            {
                "title": "Unverified App 1",
                "description": "A web project without faculty approval.",
                "technologies": ["JavaScript", "React"],
                "verified": False,
            },
            {
                "title": "Unverified App 2",
                "description": "Another unverified project.",
                "technologies": ["HTML", "CSS"],
                "verification_status": "pending",  # Not verified
            },
        ],
    }

    response = client.post("/api/v1/portfolio/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["overall_score"] == 0
    assert data["eligible_project_count"] == 0
    assert data["excluded_project_count"] == 2
    assert data["evidence_status"] == "insufficient_evidence"
    assert data["project_evaluations"] == []


def test_invalid_payload_returns_422() -> None:
    """Malformed or invalid payloads produce structured HTTP 422 responses."""
    # 1. Non-list projects field
    res1 = client.post("/api/v1/portfolio/evaluate", json={"projects": "not-a-list"})
    assert res1.status_code == 422
    assert res1.json()["error"]["code"] == "validation_error"

    # 2. Empty ATS request missing resume_text
    res2 = client.post("/api/v1/ats/analyze", json={})
    assert res2.status_code == 422
    assert res2.json()["error"]["code"] == "validation_error"

    # 3. Invalid skill gap request with non-list current_skills
    res3 = client.post("/api/v1/skills/gap", json={"current_skills": 12345})
    assert res3.status_code == 422
    assert res3.json()["error"]["code"] == "validation_error"

    # 4. Invalid deployment verification request missing url
    res4 = client.post("/api/v1/portfolio/verify-deployment", json={})
    assert res4.status_code == 422
    assert res4.json()["error"]["code"] == "validation_error"


def test_unavailable_downstream_data_graceful() -> None:
    """Empty portfolio with zero projects produces safe insufficient_evidence response without 500 error."""
    response = client.post("/api/v1/portfolio/evaluate", json={"student_id": "student-empty", "projects": []})
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 0
    assert data["eligible_project_count"] == 0
    assert data["evidence_status"] == "insufficient_evidence"


def test_ats_analysis_contract() -> None:
    """ATS analysis validates resume text and computes deterministic score & suggestions."""
    payload = {
        "resume_text": "Full Stack Engineer with extensive experience in Python, FastAPI, Docker, and React. Built distributed microservices and automated CI pipelines.",
        "target_job_description": "We are seeking a Full Stack Developer skilled in Python, FastAPI, and React.",
    }
    response = client.post("/api/v1/ats/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["ats_score"] <= 100
    assert any(s in data["detected_skills"] for s in ["FastAPI", "Python", "React", "Docker"])
    assert isinstance(data["suggestions"], list)
