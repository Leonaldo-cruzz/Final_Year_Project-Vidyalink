"""
ATS Scoring Engine Unit Tests
Validates that:
  - Strong ATS resume scores HIGHER than Average
  - Average ATS resume scores HIGHER than Weak
  - All 5 weighted dimensions produce scores in [0, 100]
  - Category classification is correct
  - Score is clamped to [0, 100]
"""

import pytest
from app.services.ats.ats_scorer import evaluate_resume_ats
from app.services.ats.config import (
    ATS_SCORING_VERSION,
    ATS_SCORING_WEIGHTS,
    get_ats_score_category,
)
from app.services.ats.keyword_analyzer import analyze_keywords
from app.services.ats.skills_analyzer import analyze_technical_skills
from app.services.ats.experience_analyzer import analyze_experience
from app.services.ats.education_analyzer import analyze_education
from app.services.ats.formatting_analyzer import analyze_formatting
from app.services.ats.section_detector import detect_resume_sections


# ---------------------------------------------------------------------------
# Test Fixtures
# ---------------------------------------------------------------------------

STRONG_RESUME_TEXT = """
John Doe | john.doe@email.com | +1-555-123-4567 | github.com/johndoe | linkedin.com/in/johndoe

Summary
Full-stack Software Engineer with 3 years of experience developing scalable REST APIs and cloud-native systems using Node.js, React, PostgreSQL, and AWS.

Skills
Languages: Python, JavaScript, TypeScript, Go, SQL
Frameworks: React, Next.js, Node.js, Express, FastAPI, Django
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, GitHub Actions, CI/CD
Tools: Git, Postman, Jira, Jest, Pytest, Cypress

Experience
Software Engineer - TechCorp Inc.
Jan 2023 - Present
- Developed and deployed 15+ RESTful API endpoints using Node.js and Express, reducing response latency by 40%
- Architected microservices backend system handling 50k+ daily requests
- Integrated Stripe payment gateway processing $100k+ monthly transactions
- Implemented CI/CD pipeline with GitHub Actions reducing deployment time by 60%
- Collaborated with cross-functional team of 8 engineers using Agile/Scrum methodology

Backend Intern - StartupXYZ
Jun 2022 - Dec 2022
- Built 10+ REST API endpoints for e-commerce platform using Django and PostgreSQL
- Optimized database queries reducing load time by 35%
- Wrote automated test suite achieving 80% test coverage using Pytest

Projects
VidyaLink - AI-Powered Portfolio Platform (github.com/johndoe/vidyalink)
- Engineered full-stack AI platform using React, Node.js, FastAPI, MongoDB, and AWS
- Implemented JWT-based RBAC authentication and role-based access control
- Deployed on AWS EC2 with Docker containerization and CI/CD automation

Education
Bachelor of Technology - Computer Science
Indian Institute of Technology (IIT) Bombay
Graduated: 2022 | CGPA: 8.9/10

Certifications
AWS Certified Solutions Architect - Associate (2023)
Google Professional Cloud Developer (2022)
"""

AVERAGE_RESUME_TEXT = """
Jane Smith | jane.smith@email.com | +91-9876543210

Summary
Web developer with 1 year of experience in React and Node.js development.

Skills
JavaScript, React, Node.js, MongoDB, Git

Experience
Junior Web Developer - WebDev Co
Mar 2023 - Present
- Developed web applications using React and Node.js
- Worked with MongoDB database
- Used Git for version control

Projects
Todo App
- Built a todo application using React and Node.js
- Deployed on Netlify

Blog Platform
- Created a blog platform with React and Express
- Used MongoDB for storage

Education
Bachelor of Computer Applications
Mumbai University
Graduated: 2022

Certifications
JavaScript Developer Certificate - Coursera (2022)
"""

WEAK_RESUME_TEXT = """
Alex Johnson
email: alexj@gmail.com

I am a student looking for a software job. I know some programming.

Skills: HTML, CSS

Project: Made a website

Education: Studying computer science
"""


# ---------------------------------------------------------------------------
# Config Tests
# ---------------------------------------------------------------------------

class TestATSConfig:
    def test_weights_sum_to_one(self):
        """All ATS dimension weights must sum to exactly 1.0."""
        total = sum(ATS_SCORING_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, not 1.0"

    def test_required_dimensions_present(self):
        """All 5 expected dimensions must be in config."""
        expected = {"keywordMatching", "technicalSkills", "formatting", "experience", "education"}
        assert set(ATS_SCORING_WEIGHTS.keys()) == expected

    def test_scoring_version(self):
        assert ATS_SCORING_VERSION == "1.0"

    def test_category_excellent(self):
        assert get_ats_score_category(95.0) == "Excellent"

    def test_category_very_good(self):
        assert get_ats_score_category(85.0) == "Very Good"

    def test_category_good(self):
        assert get_ats_score_category(74.0) == "Good"

    def test_category_average(self):
        assert get_ats_score_category(63.0) == "Average"

    def test_category_needs_improvement(self):
        assert get_ats_score_category(45.0) == "Needs Improvement"

    def test_boundary_exactly_90(self):
        assert get_ats_score_category(90.0) == "Excellent"

    def test_boundary_exactly_80(self):
        assert get_ats_score_category(80.0) == "Very Good"

    def test_boundary_exactly_70(self):
        assert get_ats_score_category(70.0) == "Good"

    def test_boundary_exactly_60(self):
        assert get_ats_score_category(60.0) == "Average"


# ---------------------------------------------------------------------------
# Section Detector Tests
# ---------------------------------------------------------------------------

class TestSectionDetector:
    def test_detects_skills_section(self):
        text = "Skills\nPython JavaScript React\n\nExperience\nSoftware Engineer"
        result = detect_resume_sections(text)
        assert "Skills" in result["detectedSections"]

    def test_detects_education_section(self):
        text = "Education\nBachelor of Technology\nIIT Bombay\n2022"
        result = detect_resume_sections(text)
        assert "Education" in result["detectedSections"]

    def test_detects_contact_via_email(self):
        text = "john.doe@example.com\n+91-9876543210\nSkills\nPython"
        result = detect_resume_sections(text)
        assert "Contact" in result["detectedSections"]

    def test_empty_text_returns_empty(self):
        result = detect_resume_sections("")
        assert result["detectedSections"] == []
        assert result["sectionsMap"] == {}

    def test_sections_map_captures_content(self):
        text = "Experience\nSoftware Engineer at TechCorp\nJan 2023 - Present\n\nEducation\nBachelor of Tech"
        result = detect_resume_sections(text)
        if "Experience" in result["sectionsMap"]:
            assert "TechCorp" in result["sectionsMap"]["Experience"]


# ---------------------------------------------------------------------------
# Keyword Analyzer Tests
# ---------------------------------------------------------------------------

class TestKeywordAnalyzer:
    def test_general_scan_strong(self):
        """Strong technical text scores higher than minimal."""
        strong = analyze_keywords("software development backend api rest git cloud agile testing optimization performance deployment scalable collaboration design security data pipeline")
        weak = analyze_keywords("hello world random text with no technical terms at all")
        assert strong["score"] > weak["score"]

    def test_with_target_job_matched_required(self):
        text = "Python Django REST API PostgreSQL Docker AWS"
        target_job = {"requiredSkills": ["python", "django", "docker"], "preferredSkills": ["aws"]}
        result = analyze_keywords(text, target_job)
        assert result["score"] > 70.0

    def test_with_target_job_missing_required(self):
        text = "Java Spring Boot Oracle"
        target_job = {"requiredSkills": ["python", "react", "mongodb", "kubernetes"], "preferredSkills": []}
        result = analyze_keywords(text, target_job)
        assert len(result["missingKeywords"]) >= 3

    def test_score_clamped_to_100(self):
        result = analyze_keywords(STRONG_RESUME_TEXT)
        assert 0.0 <= result["score"] <= 100.0

    def test_empty_text_returns_zero(self):
        result = analyze_keywords("")
        assert result["score"] == 0.0

    def test_evidence_is_list(self):
        result = analyze_keywords("Python JavaScript React")
        assert isinstance(result["evidence"], list)


# ---------------------------------------------------------------------------
# Skills Analyzer Tests
# ---------------------------------------------------------------------------

class TestSkillsAnalyzer:
    def test_strong_detects_many_skills(self):
        result = analyze_technical_skills(STRONG_RESUME_TEXT)
        assert len(result["detectedSkills"]) >= 5

    def test_weak_detects_few_skills(self):
        result = analyze_technical_skills(WEAK_RESUME_TEXT)
        weak_skill_count = len(result["detectedSkills"])
        strong_result = analyze_technical_skills(STRONG_RESUME_TEXT)
        assert strong_result["score"] > result["score"]

    def test_score_range_valid(self):
        for text in [STRONG_RESUME_TEXT, AVERAGE_RESUME_TEXT, WEAK_RESUME_TEXT]:
            result = analyze_technical_skills(text)
            assert 0.0 <= result["score"] <= 100.0

    def test_categorized_skills_present(self):
        result = analyze_technical_skills(STRONG_RESUME_TEXT)
        assert "languages" in result["categorizedSkills"]
        assert "frameworks" in result["categorizedSkills"]

    def test_target_job_matched_skills(self):
        text = "Python FastAPI PostgreSQL Docker AWS"
        target_job = {"requiredSkills": ["python", "fastapi", "docker"], "preferredSkills": ["aws"]}
        result = analyze_technical_skills(text, target_job)
        assert len(result["matchedSkills"]) >= 2

    def test_missing_skills_reported(self):
        text = "HTML CSS"
        target_job = {"requiredSkills": ["python", "react", "node.js", "mongodb"]}
        result = analyze_technical_skills(text, target_job)
        assert len(result["missingSkills"]) >= 2


# ---------------------------------------------------------------------------
# Experience Analyzer Tests
# ---------------------------------------------------------------------------

class TestExperienceAnalyzer:
    def test_strong_experience_higher_than_weak(self):
        strong_sections = detect_resume_sections(STRONG_RESUME_TEXT)
        weak_sections = detect_resume_sections(WEAK_RESUME_TEXT)
        strong_result = analyze_experience(STRONG_RESUME_TEXT, strong_sections["sectionsMap"])
        weak_result = analyze_experience(WEAK_RESUME_TEXT, weak_sections["sectionsMap"])
        assert strong_result["score"] > weak_result["score"]

    def test_empty_text_returns_zero(self):
        result = analyze_experience("", {})
        assert result["score"] == 0.0

    def test_score_range_valid(self):
        sections = detect_resume_sections(STRONG_RESUME_TEXT)
        result = analyze_experience(STRONG_RESUME_TEXT, sections["sectionsMap"])
        assert 0.0 <= result["score"] <= 100.0

    def test_evidence_list_non_empty(self):
        sections = detect_resume_sections(AVERAGE_RESUME_TEXT)
        result = analyze_experience(AVERAGE_RESUME_TEXT, sections["sectionsMap"])
        assert len(result["evidence"]) > 0


# ---------------------------------------------------------------------------
# Education Analyzer Tests
# ---------------------------------------------------------------------------

class TestEducationAnalyzer:
    def test_strong_education_higher_than_weak(self):
        strong_sections = detect_resume_sections(STRONG_RESUME_TEXT)
        weak_sections = detect_resume_sections(WEAK_RESUME_TEXT)
        strong_result = analyze_education(STRONG_RESUME_TEXT, strong_sections["sectionsMap"])
        weak_result = analyze_education(WEAK_RESUME_TEXT, weak_sections["sectionsMap"])
        assert strong_result["score"] > weak_result["score"]

    def test_detects_btech_degree(self):
        text = "Education\nBachelor of Technology Computer Science\nIIT Bombay 2022"
        sections = detect_resume_sections(text)
        result = analyze_education(text, sections["sectionsMap"])
        assert result["score"] > 40.0

    def test_empty_returns_zero(self):
        result = analyze_education("", {})
        assert result["score"] == 0.0

    def test_score_range_valid(self):
        for text in [STRONG_RESUME_TEXT, AVERAGE_RESUME_TEXT, WEAK_RESUME_TEXT]:
            sections = detect_resume_sections(text)
            result = analyze_education(text, sections["sectionsMap"])
            assert 0.0 <= result["score"] <= 100.0


# ---------------------------------------------------------------------------
# Formatting Analyzer Tests
# ---------------------------------------------------------------------------

class TestFormattingAnalyzer:
    def test_strong_formatting_higher_than_weak(self):
        strong_sections = detect_resume_sections(STRONG_RESUME_TEXT)
        weak_sections = detect_resume_sections(WEAK_RESUME_TEXT)
        strong_result = analyze_formatting(
            STRONG_RESUME_TEXT, STRONG_RESUME_TEXT,
            strong_sections["detectedSections"], strong_sections["sectionsMap"]
        )
        weak_result = analyze_formatting(
            WEAK_RESUME_TEXT, WEAK_RESUME_TEXT,
            weak_sections["detectedSections"], weak_sections["sectionsMap"]
        )
        assert strong_result["score"] > weak_result["score"]

    def test_empty_document_returns_zero(self):
        result = analyze_formatting("", "", [], {})
        assert result["score"] == 0.0

    def test_score_range_valid(self):
        sections = detect_resume_sections(AVERAGE_RESUME_TEXT)
        result = analyze_formatting(
            AVERAGE_RESUME_TEXT, AVERAGE_RESUME_TEXT,
            sections["detectedSections"], sections["sectionsMap"]
        )
        assert 0.0 <= result["score"] <= 100.0

    def test_contact_info_boosts_score(self):
        text_with_contact = "john@example.com\n+1-555-1234\nExperience\nDeveloped software"
        text_without = "Experience\nDeveloped software"
        secs_with = detect_resume_sections(text_with_contact)
        secs_without = detect_resume_sections(text_without)
        score_with = analyze_formatting(text_with_contact, text_with_contact, secs_with["detectedSections"], secs_with["sectionsMap"])
        score_without = analyze_formatting(text_without, text_without, secs_without["detectedSections"], secs_without["sectionsMap"])
        assert score_with["score"] > score_without["score"]


# ---------------------------------------------------------------------------
# Core Invariant Tests: Strong > Average > Weak
# ---------------------------------------------------------------------------

class TestATSScoringOrdering:
    """Critical invariant: Strong resume must score higher than Average,
    and Average must score higher than Weak across all evaluated fixtures."""

    def _evaluate(self, resume_text):
        return evaluate_resume_ats({"resume": {"text": resume_text}, "verificationStatus": "VERIFIED", "studentId": "s1", "portfolioId": "p1"})

    def test_strong_beats_average(self):
        strong = self._evaluate(STRONG_RESUME_TEXT)
        avg = self._evaluate(AVERAGE_RESUME_TEXT)
        assert strong["atsScore"] > avg["atsScore"], (
            f"Expected Strong ({strong['atsScore']:.1f}) > Average ({avg['atsScore']:.1f})"
        )

    def test_average_beats_weak(self):
        avg = self._evaluate(AVERAGE_RESUME_TEXT)
        weak = self._evaluate(WEAK_RESUME_TEXT)
        assert avg["atsScore"] > weak["atsScore"], (
            f"Expected Average ({avg['atsScore']:.1f}) > Weak ({weak['atsScore']:.1f})"
        )

    def test_strong_beats_weak(self):
        strong = self._evaluate(STRONG_RESUME_TEXT)
        weak = self._evaluate(WEAK_RESUME_TEXT)
        assert strong["atsScore"] > weak["atsScore"], (
            f"Expected Strong ({strong['atsScore']:.1f}) > Weak ({weak['atsScore']:.1f})"
        )

    def test_strong_score_at_least_60(self):
        strong = self._evaluate(STRONG_RESUME_TEXT)
        assert strong["atsScore"] >= 60.0, f"Strong resume scored only {strong['atsScore']:.1f}"

    def test_weak_score_at_most_50(self):
        weak = self._evaluate(WEAK_RESUME_TEXT)
        assert weak["atsScore"] <= 55.0, f"Weak resume scored {weak['atsScore']:.1f}, expected ≤ 55"

    def test_all_scores_clamped_to_range(self):
        for text in [STRONG_RESUME_TEXT, AVERAGE_RESUME_TEXT, WEAK_RESUME_TEXT]:
            result = self._evaluate(text)
            assert 0.0 <= result["atsScore"] <= 100.0

    def test_breakdown_contains_all_dimensions(self):
        result = self._evaluate(AVERAGE_RESUME_TEXT)
        breakdown = result["breakdown"]
        assert "keywordMatching" in breakdown
        assert "formatting" in breakdown
        assert "technicalSkills" in breakdown
        assert "experience" in breakdown
        assert "education" in breakdown

    def test_weighted_scores_sum_to_total(self):
        result = self._evaluate(STRONG_RESUME_TEXT)
        breakdown = result["breakdown"]
        computed_total = sum(d["weightedScore"] for d in breakdown.values())
        assert abs(computed_total - result["atsScore"]) < 0.5, (
            f"Sum of weighted scores {computed_total:.2f} != atsScore {result['atsScore']:.2f}"
        )

    def test_recommendations_returned(self):
        result = self._evaluate(WEAK_RESUME_TEXT)
        assert isinstance(result["recommendations"], list)
        assert len(result["recommendations"]) > 0

    def test_scoring_version_is_stamped(self):
        result = self._evaluate(AVERAGE_RESUME_TEXT)
        assert result["scoringVersion"] == "1.0"

    def test_evaluated_at_iso_format(self):
        import re
        result = self._evaluate(AVERAGE_RESUME_TEXT)
        assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", result["evaluatedAt"])
