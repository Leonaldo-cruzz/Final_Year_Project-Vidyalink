"""API endpoint tests for skill extraction and gap analysis routes."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ===========================================================================
# POST /api/v1/evaluation/skills/extract
# ===========================================================================


class TestSkillExtractionEndpoint:
    BASE_PAYLOAD = {
        "studentId": "student-001",
        "portfolioId": "portfolio-001",
        "verificationStatus": "VERIFIED",
        "resume": {"text": "React Node.js MongoDB Python Docker TypeScript"},
        "projects": [
            {
                "title": "VidyaLink",
                "description": "Full stack React and Node.js application with MongoDB",
                "technologies": ["React", "Node.js", "MongoDB"],
            }
        ],
        "certificates": [
            {
                "title": "AWS Certified Solutions Architect",
                "issuer": "Amazon",
                "skills": ["AWS"],
            }
        ],
        "github": {"languages": ["JavaScript", "Python", "TypeScript"]},
        "endorsements": [
            {
                "endorserName": "Dr. Sharma",
                "skills": ["React", "Node.js"],
            }
        ],
    }

    def test_returns_200_on_valid_payload(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        assert response.status_code == 200

    def test_response_has_success_true(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        assert response.json()["success"] is True

    def test_response_has_skills_list(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        data = response.json()["data"]
        assert "skills" in data
        assert isinstance(data["skills"], list)

    def test_react_extracted_with_multiple_sources(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        data = response.json()["data"]
        react = next((s for s in data["skills"] if s["canonicalName"] == "react"), None)
        assert react is not None
        assert len(react["sources"]) >= 2

    def test_totalSkillsCount_matches_skills_length(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        data = response.json()["data"]
        assert data["totalSkillsCount"] == len(data["skills"])

    def test_rejects_unverified_portfolio(self):
        payload = {**self.BASE_PAYLOAD, "verificationStatus": "PENDING"}
        response = client.post("/api/v1/evaluation/skills/extract", json=payload)
        assert response.status_code in (400, 422)

    def test_rejects_empty_student_id(self):
        payload = {**self.BASE_PAYLOAD, "studentId": ""}
        response = client.post("/api/v1/evaluation/skills/extract", json=payload)
        assert response.status_code == 422

    def test_rejects_missing_student_id(self):
        payload = {k: v for k, v in self.BASE_PAYLOAD.items() if k != "studentId"}
        response = client.post("/api/v1/evaluation/skills/extract", json=payload)
        assert response.status_code == 422

    def test_empty_portfolio_returns_zero_skills(self):
        payload = {
            **self.BASE_PAYLOAD,
            "resume": {},
            "projects": [],
            "certificates": [],
            "github": {},
            "endorsements": [],
        }
        response = client.post("/api/v1/evaluation/skills/extract", json=payload)
        assert response.status_code == 200
        assert response.json()["data"]["totalSkillsCount"] == 0

    def test_no_duplicate_canonical_names_in_skills(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        skills = response.json()["data"]["skills"]
        canonical_names = [s["canonicalName"] for s in skills]
        assert len(canonical_names) == len(set(canonical_names))

    def test_every_skill_has_confidence_between_0_and_1(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        skills = response.json()["data"]["skills"]
        for skill in skills:
            assert 0.0 <= skill["confidence"] <= 1.0

    def test_every_skill_has_non_empty_evidence(self):
        response = client.post("/api/v1/evaluation/skills/extract", json=self.BASE_PAYLOAD)
        skills = response.json()["data"]["skills"]
        for skill in skills:
            assert len(skill["evidence"]) >= 1


# ===========================================================================
# POST /api/v1/evaluation/skills/gap-analysis
# ===========================================================================


class TestSkillGapEndpoint:
    FULLSTACK_SKILLS = [
        {"name": "React", "canonicalName": "react", "category": "frontend", "confidence": 0.85, "sources": ["resume", "project", "endorsement"]},
        {"name": "Node.js", "canonicalName": "node.js", "category": "backend", "confidence": 0.75, "sources": ["resume", "project"]},
        {"name": "MongoDB", "canonicalName": "mongodb", "category": "database", "confidence": 0.65, "sources": ["project"]},
    ]

    BASE_GAP_PAYLOAD = {
        "studentId": "student-001",
        "skills": FULLSTACK_SKILLS,
        "targetRole": {
            "title": "Full Stack Developer",
            "requiredSkills": ["React", "Node.js", "MongoDB"],
            "preferredSkills": ["Docker", "AWS"],
        },
    }

    def test_returns_200_on_valid_payload(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        assert response.status_code == 200

    def test_response_has_success_true(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        assert response.json()["success"] is True

    def test_all_required_skills_matched(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        data = response.json()["data"]
        assert data["missingRequiredSkills"] == []
        assert len(data["matchedSkills"]) == 3

    def test_preferred_skills_in_missing(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        data = response.json()["data"]
        assert "Docker" in data["missingPreferredSkills"]
        assert "AWS" in data["missingPreferredSkills"]

    def test_match_percentage_is_100_when_all_required_present(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        data = response.json()["data"]
        assert data["matchPercentage"] == 100.0

    def test_alias_in_job_description_is_normalized(self):
        payload = {
            **self.BASE_GAP_PAYLOAD,
            "targetRole": {
                "title": "Frontend Dev",
                "requiredSkills": ["ReactJS"],
                "preferredSkills": [],
            },
        }
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=payload)
        data = response.json()["data"]
        matched_canonical = [m["canonicalName"] for m in data["matchedSkills"]]
        assert "react" in matched_canonical

    def test_empty_student_skills_results_in_zero_match(self):
        payload = {
            "studentId": "student-002",
            "skills": [],
            "targetRole": {
                "title": "Backend Developer",
                "requiredSkills": ["Node.js", "PostgreSQL"],
                "preferredSkills": ["Docker"],
            },
        }
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=payload)
        data = response.json()["data"]
        assert data["matchPercentage"] == 0.0
        assert len(data["matchedSkills"]) == 0

    def test_rejects_missing_student_id(self):
        payload = {k: v for k, v in self.BASE_GAP_PAYLOAD.items() if k != "studentId"}
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=payload)
        assert response.status_code == 422

    def test_target_role_title_in_response(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        data = response.json()["data"]
        assert data["targetRole"] == "Full Stack Developer"

    def test_analysis_version_is_1_0(self):
        response = client.post("/api/v1/evaluation/skills/gap-analysis", json=self.BASE_GAP_PAYLOAD)
        data = response.json()["data"]
        assert data["analysisVersion"] == "1.0"
