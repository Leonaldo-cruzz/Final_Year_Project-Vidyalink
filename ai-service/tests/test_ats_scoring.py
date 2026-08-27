"""ATS Scoring Engine Unit Tests."""

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


class TestATSConfig:
    def test_weights_sum_to_one(self):
        total = sum(ATS_SCORING_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9

    def test_required_dimensions_present(self):
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


class TestKeywordAnalyzer:
    def test_general_scan_strong(self):
        strong = analyze_keywords("software development backend api rest git cloud agile testing optimization performance deployment scalable collaboration design security data pipeline")
        weak = analyze_keywords("hello world random text with no technical terms at all")
        assert strong["score"] > weak["score"]

    def test_with_target_job_matched_required(self):
        text = "Python Django REST API PostgreSQL Docker AWS"
        target_job = {"requiredSkills": ["python", "django", "docker"], "preferredSkills": ["aws"]}
        result = analyze_keywords(text, target_job)
        assert result["score"] > 70.0


class TestSkillsAnalyzer:
    def test_strong_detects_many_skills(self):
        result = analyze_technical_skills(STRONG_RESUME_TEXT)
        assert len(result["detectedSkills"]) >= 5

    def test_target_job_matched_skills(self):
        text = "Python FastAPI PostgreSQL Docker AWS"
        target_job = {"requiredSkills": ["python", "fastapi", "docker"], "preferredSkills": ["aws"]}
        result = analyze_technical_skills(text, target_job)
        assert len(result["matchedSkills"]) >= 2


class TestATSScoringOrdering:
    def _evaluate(self, resume_text):
        return evaluate_resume_ats({"resume": {"text": resume_text}, "verificationStatus": "VERIFIED", "studentId": "s1", "portfolioId": "p1"})

    def test_strong_beats_average(self):
        strong = self._evaluate(STRONG_RESUME_TEXT)
        avg = self._evaluate(AVERAGE_RESUME_TEXT)
        assert strong["atsScore"] > avg["atsScore"]

    def test_average_beats_weak(self):
        avg = self._evaluate(AVERAGE_RESUME_TEXT)
        weak = self._evaluate(WEAK_RESUME_TEXT)
        assert avg["atsScore"] > weak["atsScore"]

    def test_all_scores_clamped_to_range(self):
        for text in [STRONG_RESUME_TEXT, AVERAGE_RESUME_TEXT, WEAK_RESUME_TEXT]:
            result = self._evaluate(text)
            assert 0.0 <= result["atsScore"] <= 100.0
