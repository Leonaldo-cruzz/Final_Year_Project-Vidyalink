"""Tests for the skill taxonomy, normalizer, and source extractors."""

import pytest
from app.services.skills.normalizer import normalize_skill, normalize_skill_list
from app.services.skills.extractors import (
    extract_from_resume,
    extract_from_projects,
    extract_from_certificates,
    extract_from_github,
    extract_from_endorsements,
)

# ===========================================================================
# Fixtures
# ===========================================================================

STRONG_FULLSTACK_RESUME = {
    "text": "Skills: React, Node.js, MongoDB, Python, Docker, AWS, PostgreSQL, TypeScript"
}

FRONTEND_RESUME = {
    "text": "Frontend expertise in React, Vue.js, CSS, Tailwind CSS, JavaScript, Figma"
}

MINIMAL_RESUME = {
    "text": "Proficient in Microsoft Office and basic computer skills"
}

STRONG_PROJECTS = [
    {
        "title": "VidyaLink Platform",
        "description": "Full-stack platform using React and Node.js with MongoDB",
        "technologies": ["React", "Node.js", "MongoDB", "FastAPI"],
    },
    {
        "title": "ML Classifier",
        "description": "Machine learning classifier using Python and TensorFlow",
        "technologies": ["Python", "TensorFlow", "Scikit-Learn"],
    },
]

FRONTEND_PROJECTS = [
    {
        "title": "Portfolio Site",
        "description": "Personal portfolio site in React",
        "technologies": ["React", "JavaScript", "CSS"],
    }
]

CERTIFICATES = [
    {
        "title": "AWS Certified Solutions Architect",
        "issuer": "Amazon Web Services",
        "skills": ["AWS", "Cloud Architecture"],
    },
    {
        "title": "Docker Essentials",
        "issuer": "Docker Inc",
        "skills": ["Docker"],
    },
]

GITHUB_STRONG = {
    "languages": ["JavaScript", "Python", "TypeScript", "CSS"],
    "repositoryCount": 15,
    "activeRepositoryCount": 8,
}

GITHUB_EMPTY = {}

ENDORSEMENTS_STRONG = [
    {
        "endorserName": "Dr. Sharma",
        "endorserRole": "Alumni Mentor",
        "skills": ["React", "Node.js"],
    }
]

# ===========================================================================
# Normalizer Tests
# ===========================================================================


class TestNormalizer:
    def test_react_aliases(self):
        for alias in ["React.js", "ReactJS", "react js"]:
            result = normalize_skill(alias)
            assert result is not None, f"Expected non-None for alias: {alias}"
            assert result["canonicalName"] == "react"
            assert result["name"] == "React"

    def test_nodejs_aliases(self):
        for alias in ["Node", "nodejs", "Node.js", "node js"]:
            result = normalize_skill(alias)
            assert result is not None, f"Expected non-None for alias: {alias}"
            assert result["canonicalName"] == "node.js"

    def test_mongodb_aliases(self):
        for alias in ["Mongo", "mongodb"]:
            result = normalize_skill(alias)
            assert result is not None
            assert result["canonicalName"] == "mongodb"

    def test_postgresql_aliases(self):
        for alias in ["Postgres", "pgsql", "postgresql"]:
            result = normalize_skill(alias)
            assert result is not None
            assert result["canonicalName"] == "postgresql"

    def test_js_ts_aliases(self):
        assert normalize_skill("JS")["canonicalName"] == "javascript"
        assert normalize_skill("TS")["canonicalName"] == "typescript"

    def test_kubernetes_alias(self):
        result = normalize_skill("k8s")
        assert result["canonicalName"] == "kubernetes"

    def test_tailwind_alias(self):
        for alias in ["Tailwind", "tailwindcss", "tailwind css"]:
            result = normalize_skill(alias)
            assert result is not None
            assert result["canonicalName"] == "tailwind_css"

    def test_empty_string_returns_none(self):
        assert normalize_skill("") is None

    def test_none_returns_none(self):
        assert normalize_skill(None) is None

    def test_whitespace_only_returns_none(self):
        assert normalize_skill("   ") is None

    def test_unknown_short_token_returns_none(self):
        result = normalize_skill("x")
        assert result is None

    def test_normalize_list_deduplication(self):
        raw = ["react", "React.js", "ReactJS", "Node.js", "nodejs"]
        result = normalize_skill_list(raw)
        canonical_names = [s["canonicalName"] for s in result]
        assert canonical_names.count("react") == 1
        assert canonical_names.count("node.js") == 1

    def test_normalize_list_empty(self):
        assert normalize_skill_list([]) == []


# ===========================================================================
# Resume Extractor Tests
# ===========================================================================


class TestResumeExtractor:
    def test_strong_fullstack_extraction(self):
        result = extract_from_resume(STRONG_FULLSTACK_RESUME)
        canonical_names = [r["canonicalName"] for r in result]
        assert "react" in canonical_names
        assert "node.js" in canonical_names
        assert "mongodb" in canonical_names
        assert "python" in canonical_names

    def test_frontend_extraction(self):
        result = extract_from_resume(FRONTEND_RESUME)
        canonical_names = [r["canonicalName"] for r in result]
        assert "react" in canonical_names
        assert "javascript" in canonical_names

    def test_minimal_resume_extracts_no_tech_skills(self):
        result = extract_from_resume(MINIMAL_RESUME)
        # Generic office skills should not match tech taxonomy
        canonical_names = [r["canonicalName"] for r in result]
        assert "react" not in canonical_names
        assert "python" not in canonical_names

    def test_source_is_resume(self):
        result = extract_from_resume(STRONG_FULLSTACK_RESUME)
        for item in result:
            assert item["source"] == "resume"

    def test_evidence_is_resume_label(self):
        result = extract_from_resume(STRONG_FULLSTACK_RESUME)
        for item in result:
            assert "Resume" in item["evidence"]

    def test_empty_resume_returns_empty(self):
        assert extract_from_resume({}) == []
        assert extract_from_resume(None) == []


# ===========================================================================
# Project Extractor Tests
# ===========================================================================


class TestProjectExtractor:
    def test_strong_project_extracts_all_techs(self):
        result = extract_from_projects(STRONG_PROJECTS)
        canonical_names = [r["canonicalName"] for r in result]
        assert "react" in canonical_names
        assert "node.js" in canonical_names
        assert "mongodb" in canonical_names
        assert "fastapi" in canonical_names

    def test_source_is_project(self):
        result = extract_from_projects(FRONTEND_PROJECTS)
        for item in result:
            assert item["source"] == "project"

    def test_evidence_contains_project_title(self):
        result = extract_from_projects([STRONG_PROJECTS[0]])
        for item in result:
            assert "VidyaLink" in item["evidence"]

    def test_empty_projects_returns_empty(self):
        assert extract_from_projects([]) == []

    def test_none_projects_returns_empty(self):
        assert extract_from_projects(None) == []


# ===========================================================================
# Certificate Extractor Tests
# ===========================================================================


class TestCertificateExtractor:
    def test_aws_certificate_extracts_aws(self):
        result = extract_from_certificates(CERTIFICATES)
        canonical_names = [r["canonicalName"] for r in result]
        assert "aws" in canonical_names

    def test_docker_certificate_extracts_docker(self):
        result = extract_from_certificates(CERTIFICATES)
        canonical_names = [r["canonicalName"] for r in result]
        assert "docker" in canonical_names

    def test_source_is_certificate(self):
        result = extract_from_certificates(CERTIFICATES)
        for item in result:
            assert item["source"] == "certificate"

    def test_empty_certificates_returns_empty(self):
        assert extract_from_certificates([]) == []


# ===========================================================================
# GitHub Extractor Tests
# ===========================================================================


class TestGitHubExtractor:
    def test_javascript_extracted_from_github_languages(self):
        result = extract_from_github(GITHUB_STRONG)
        canonical_names = [r["canonicalName"] for r in result]
        assert "javascript" in canonical_names

    def test_python_extracted_from_github_languages(self):
        result = extract_from_github(GITHUB_STRONG)
        canonical_names = [r["canonicalName"] for r in result]
        assert "python" in canonical_names

    def test_source_is_github(self):
        result = extract_from_github(GITHUB_STRONG)
        for item in result:
            assert item["source"] == "github"

    def test_evidence_mentions_repository_language(self):
        result = extract_from_github(GITHUB_STRONG)
        for item in result:
            assert "GitHub" in item["evidence"]

    def test_empty_github_returns_empty(self):
        assert extract_from_github({}) == []
        assert extract_from_github(None) == []


# ===========================================================================
# Endorsement Extractor Tests
# ===========================================================================


class TestEndorsementExtractor:
    def test_endorsement_extracts_react(self):
        result = extract_from_endorsements(ENDORSEMENTS_STRONG)
        canonical_names = [r["canonicalName"] for r in result]
        assert "react" in canonical_names

    def test_endorsement_extracts_nodejs(self):
        result = extract_from_endorsements(ENDORSEMENTS_STRONG)
        canonical_names = [r["canonicalName"] for r in result]
        assert "node.js" in canonical_names

    def test_source_is_endorsement(self):
        result = extract_from_endorsements(ENDORSEMENTS_STRONG)
        for item in result:
            assert item["source"] == "endorsement"

    def test_evidence_contains_endorser_name(self):
        result = extract_from_endorsements(ENDORSEMENTS_STRONG)
        for item in result:
            assert "Dr. Sharma" in item["evidence"]

    def test_empty_endorsements_returns_empty(self):
        assert extract_from_endorsements([]) == []
