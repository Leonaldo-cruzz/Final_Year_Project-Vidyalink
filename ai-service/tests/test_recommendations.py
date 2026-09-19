"""Comprehensive tests for recommendation engine, skill gap, and intelligent matching."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.models.portfolio import PortfolioSubmission, RecommendationCandidate, RecommendationsRequest
from src.services.recommendation_engine import recommend
from src.services.skill_analysis import extract_skills, skill_gap

client = TestClient(app)


# 1. Skill extraction
def test_skill_extraction() -> None:
    portfolio = PortfolioSubmission(
        skills=["Python", "PostgreSQL"],
        projects=[{
            "title": "Backend API",
            "technologies": ["FastAPI", "Docker"],
            "description": "Implemented microservice with Redis cache.",
        }],
        resume="Experienced in REST APIs and Git workflows.",
    )
    result = extract_skills(portfolio)
    detected = result["detected_skills"]
    assert "Python" in detected
    assert "PostgreSQL" in detected
    assert "FastAPI" in detected
    assert "Docker" in detected
    assert "Redis" in detected
    assert "REST APIs" in detected
    assert "Git" in detected
    # Sources are tracked accurately
    assert "profile.skills" in result["skill_sources"]["Python"]
    assert "project:Backend API.technologies" in result["skill_sources"]["FastAPI"]


# 2. Empty skill input
def test_empty_skill_input() -> None:
    portfolio = PortfolioSubmission(
        skills=[],
        projects=[],
        resume="",
    )
    result = extract_skills(portfolio)
    assert result["detected_skills"] == []
    assert result["skill_sources"] == {}
    assert result["confidence"] == {}


# 3. Skill gap
def test_skill_gap() -> None:
    current = ["Node.js", "Express", "MongoDB", "REST APIs"]
    required = ["Node.js", "Express", "MongoDB", "REST APIs", "Docker", "Redis"]
    result = skill_gap(current, "Backend Developer", required)
    assert sorted(result.matched_skills) == ["Express", "MongoDB", "Node.js", "REST APIs"]
    assert sorted(result.missing_skills) == ["Docker", "Redis"]
    assert result.coverage_percentage == 66.67
    assert len(result.recommendations) == 2


# 4. No required skills
def test_no_required_skills() -> None:
    result = skill_gap(["Python", "SQL"], target_role=None, required_skills=[])
    assert result.coverage_percentage == 0.0
    assert result.matched_skills == []
    assert result.missing_skills == []
    assert "Not enough information" in result.recommendations[0]


# 5. Exact skill match
def test_exact_skill_match() -> None:
    skills = ["Python", "SQL", "Git"]
    result = skill_gap(skills, "python developer", ["Python", "SQL", "Git"])
    assert result.coverage_percentage == 100.0
    assert sorted(result.matched_skills) == ["Git", "Python", "SQL"]
    assert result.missing_skills == []
    assert result.recommendations == []


# 6. Partial match
def test_partial_match() -> None:
    current = ["JavaScript", "React"]
    required = ["JavaScript", "React", "TypeScript", "Next.js"]
    result = skill_gap(current, "Frontend Developer", required)
    assert sorted(result.matched_skills) == ["JavaScript", "React"]
    assert sorted(result.missing_skills) == ["Next.js", "TypeScript"]
    assert result.coverage_percentage == 50.0


# 7. Deterministic matching
def test_deterministic_matching() -> None:
    candidate = RecommendationCandidate(
        id="alumni_123",
        name="Priya Sharma",
        title="Senior Backend Engineer",
        organization="TechCorp",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        domains=["Backend Development", "Cloud Infrastructure"],
        graduation_year=2022,
    )
    request = RecommendationsRequest(
        technical_skills=["Python", "FastAPI", "SQL"],
        technologies=["PostgreSQL"],
        career_interests=["Backend Development"],
        project_domains=["Cloud Infrastructure"],
        graduation_year=2024,
        portfolio_score=85.0,
        available_alumni_mentors=[candidate],
    )
    result_1 = recommend(request)
    result_2 = recommend(request)

    assert result_1.alumni_mentors[0].match_score == result_2.alumni_mentors[0].match_score
    assert result_1.alumni_mentors[0].reason == result_2.alumni_mentors[0].reason
    assert result_1.alumni_mentors[0].matched_signals == result_2.alumni_mentors[0].matched_signals


# 8. Alumni matching
def test_alumni_matching() -> None:
    alumni = RecommendationCandidate(
        id="alm-1",
        name="Amit Verma",
        title="Staff Engineer",
        organization="InnovateX",
        skills=["Python", "Machine Learning", "FastAPI"],
        domains=["AI / ML"],
        graduation_year=2021,
    )
    request = RecommendationsRequest(
        technical_skills=["Python", "Machine Learning"],
        career_interests=["AI / ML"],
        graduation_year=2025,
        portfolio_score=90.0,
        available_alumni_mentors=[alumni],
    )
    result = recommend(request)
    assert len(result.alumni_mentors) == 1
    mentor = result.alumni_mentors[0]
    assert mentor.id == "alm-1"
    assert mentor.match_score > 60
    assert "Python" in mentor.matched_skills
    assert "Machine Learning" in mentor.matched_skills
    assert any("matching technical skill" in signal for signal in mentor.matched_signals)
    assert "Recommended because of" in mentor.reason


# 9. No alumni matches
def test_no_alumni_matches() -> None:
    unrelated_alumni = RecommendationCandidate(
        id="alm-unrelated",
        name="Jane Doe",
        skills=["Embedded C", "Hardware Design"],
        domains=["Robotics"],
    )
    request = RecommendationsRequest(
        technical_skills=["Python", "FastAPI"],
        career_interests=["Web Development"],
        available_alumni_mentors=[unrelated_alumni],
    )
    result = recommend(request)
    assert result.alumni_mentors == []
    assert result.alumni == []
    assert any("No matching alumni found" in note for note in result.notes)


# 10. Opportunity matching
def test_opportunity_matching() -> None:
    opp = RecommendationCandidate(
        id="opp-101",
        name="Backend Engineering Intern",
        organization="CloudScale Inc",
        skills=["Python", "FastAPI", "Docker", "PostgreSQL"],
        domains=["Cloud Computing", "Backend"],
    )
    request = RecommendationsRequest(
        technical_skills=["Python", "FastAPI"],
        career_interests=["Backend"],
        portfolio_score=80.0,
        available_job_opportunities=[opp],
    )
    result = recommend(request)
    assert len(result.recruiter_opportunities) == 1
    opp_result = result.recruiter_opportunities[0]
    assert opp_result.id == "opp-101"
    assert opp_result.opportunity_id == "opp-101"
    assert "Python" in opp_result.matched_skills
    assert "FastAPI" in opp_result.matched_skills
    assert "Docker" in opp_result.missing_skills
    assert opp_result.match_score > 40
    assert "Recommended because it" in opp_result.reason


# 11. No opportunity matches
def test_no_opportunity_matches() -> None:
    opp = RecommendationCandidate(
        id="opp-mobile",
        name="iOS Developer Role",
        skills=["Swift", "SwiftUI", "CoreData"],
        domains=["Mobile App"],
    )
    request = RecommendationsRequest(
        technical_skills=["Python", "Machine Learning"],
        career_interests=["Data Science"],
        available_job_opportunities=[opp],
    )
    result = recommend(request)
    assert result.recruiter_opportunities == []
    assert result.opportunities == []
    assert any("No matching opportunities available" in note for note in result.notes)


# 12. Recommendation reasons
def test_recommendation_reasons() -> None:
    alumni = RecommendationCandidate(
        id="alm-reasons",
        name="Rahul Roy",
        skills=["React", "Node.js"],
        domains=["Web Development"],
        graduation_year=2023,
    )
    request = RecommendationsRequest(
        technical_skills=["React", "Node.js"],
        career_interests=["Web Development"],
        graduation_year=2025,
        available_alumni_mentors=[alumni],
    )
    result = recommend(request)
    mentor = result.alumni_mentors[0]
    assert mentor.reason.startswith("Recommended because of")
    assert "React" in mentor.reason
    assert "Node.js" in mentor.reason
    assert "Web Development" in mentor.reason


# 13. Missing optional fields
def test_missing_optional_fields() -> None:
    # Candidate and request have no graduation years, no portfolio score, no target skills
    alumni = RecommendationCandidate(
        id="alm-minimal",
        name="Alex Smith",
        skills=["Python"],
    )
    opp = RecommendationCandidate(
        id="opp-minimal",
        name="Python Role",
        skills=["Python"],
    )
    request = RecommendationsRequest(
        technical_skills=["Python"],
        available_alumni_mentors=[alumni],
        available_job_opportunities=[opp],
    )
    result = recommend(request)
    assert len(result.alumni_mentors) == 1
    assert len(result.recruiter_opportunities) == 1
    assert result.skills_to_develop == []
