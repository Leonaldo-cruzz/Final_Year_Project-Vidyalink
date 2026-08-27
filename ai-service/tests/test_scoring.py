"""Unit tests for the Portfolio Evaluation Engine scoring modules and fixtures."""

import pytest
from app.services.scoring import (
    SCORING_VERSION,
    SCORING_WEIGHTS,
    get_score_category,
    score_project_complexity,
    score_technology_stack,
    score_github_activity,
    score_documentation_quality,
    score_innovation,
    score_code_quality,
    evaluate_portfolio_score,
)

# ---------------------------------------------------------------------------
# Complete Portfolio Fixtures: Strong, Average, Weak
# ---------------------------------------------------------------------------

STRONG_PORTFOLIO = {
    "studentId": "student_strong_001",
    "portfolioId": "portfolio_strong_001",
    "verificationStatus": "VERIFIED",
    "skills": ["React", "TypeScript", "Node.js", "Express", "FastAPI", "MongoDB", "PostgreSQL", "Docker", "AWS", "Python"],
    "projects": [
        {
            "title": "VidyaLink AI Recruitment Engine",
            "description": "Enterprise multi-tier platform connecting students, recruiters, and faculty with automated verification.",
            "detailedDescription": "Designed a complete production-grade system with microservices architecture, JWT authentication, and automated scoring.",
            "technologies": ["React", "TypeScript", "Node.js", "FastAPI", "MongoDB", "Redis", "Docker", "AWS", "WebSockets", "Jest", "GitHub Actions"],
            "category": "EdTech / Recruitment",
            "domain": "EdTech",
            "githubRepository": "https://github.com/strong-dev/vidyalink",
            "liveDeployment": "https://vidyalink.example.com",
            "demoVideo": "https://youtube.com/watch?v=demo123",
            "documentationUrl": "https://docs.vidyalink.example.com",
            "teamMembers": ["student_strong_001", "teammate_002"],
            "documentation": {
                "readme": "Comprehensive README with architecture diagrams and API specs.",
                "setupInstructions": "docker compose up -d to run full stack locally.",
                "architectureDocumentation": "Microservice interaction overview with event bus.",
                "apiDocumentation": "OpenAPI v3 REST specifications with request schemas.",
                "usageDocumentation": "Complete user journeys for faculty, students, and recruiters.",
            },
            "codeQuality": {
                "testStatus": "PASSED",
                "hasTests": True,
                "coveragePercentage": 88.5,
                "lintStatus": "PASSED",
                "ciStatus": "PASSED",
                "hasCiCd": True,
            },
        },
        {
            "title": "FinTech Crypto Payment Gateway",
            "description": "Secure transaction processor with real-time settlement and fraud analytics.",
            "detailedDescription": "High-throughput financial ledger handling real-time payment reconciliation using PostgreSQL and Redis.",
            "technologies": ["Go", "PostgreSQL", "Redis", "Docker", "Stripe", "OAuth", "pytest", "GitHub Actions"],
            "category": "FinTech",
            "domain": "FinTech",
            "githubRepository": "https://github.com/strong-dev/fintech-gateway",
            "liveDeployment": "https://fintech.example.com",
            "demoVideo": "https://youtube.com/watch?v=fintechdemo",
            "documentation": {
                "readme": "Detailed security and compliance architecture README.",
                "setupInstructions": "Run migrations and start worker queue.",
                "apiDocumentation": "Stripe-compatible webhook and transaction endpoints.",
            },
            "codeQuality": {
                "testStatus": "PASSED",
                "hasTests": True,
                "coveragePercentage": 92.0,
                "lintStatus": "CLEAN",
                "ciStatus": "PASSED",
                "hasCiCd": True,
            },
        },
    ],
    "certificates": [
        {
            "title": "AWS Certified Solutions Architect",
            "issuer": "Amazon Web Services",
            "issueDate": "2025-01-10",
        },
        {
            "title": "MongoDB Certified Developer",
            "issuer": "MongoDB Inc.",
            "issueDate": "2024-11-20",
        },
    ],
    "github": {
        "repositoryCount": 18,
        "commitCount": 420,
        "contributionActivity": 150,
        "languages": ["TypeScript", "Python", "Go", "JavaScript"],
        "stars": 45,
        "forks": 14,
        "readmePresent": True,
        "lastActivity": "2026-08-25T10:00:00Z",
    },
    "resume": {
        "summary": "Full-stack cloud engineer with 2+ years internship experience in scalable systems.",
    },
}

AVERAGE_PORTFOLIO = {
    "studentId": "student_avg_002",
    "portfolioId": "portfolio_avg_002",
    "verificationStatus": "VERIFIED",
    "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Express", "Python", "SQL"],
    "projects": [
        {
            "title": "E-Commerce Storefront",
            "description": "Standard MERN stack e-commerce web application with user cart and product catalogue.",
            "detailedDescription": "Built using React and Express with MongoDB persistence and basic JWT login with REST API endpoints.",
            "technologies": ["React", "Node.js", "Express", "MongoDB", "JWT", "Jest"],
            "category": "Web Application",
            "domain": "E-Commerce",
            "githubRepository": "https://github.com/avg-dev/ecommerce-app",
            "liveDeployment": "https://ecommerce.example.vercel.app",
            "documentation": {
                "readme": "Comprehensive project README with setup and installation guides.",
                "setupInstructions": "npm install && npm run dev",
                "apiDocumentation": "Endpoints for /api/products, /api/auth, /api/orders.",
                "usageDocumentation": "Step by step usage instructions.",
            },
            "codeQuality": {
                "testStatus": "PASSED",
                "hasTests": True,
                "coveragePercentage": 60.0,
                "lintStatus": "PASSED",
            },
        },
        {
            "title": "Student Task Manager",
            "description": "Task management utility built with Python and SQLite for organizing assignments.",
            "detailedDescription": "Command line and web utility for task tracking with automated deadline alerts.",
            "technologies": ["Python", "Flask", "SQLite", "HTML", "CSS"],
            "category": "Productivity Tool",
            "githubRepository": "https://github.com/avg-dev/task-manager",
            "documentation": {
                "readme": "README file with usage guidelines.",
                "setupInstructions": "pip install -r requirements.txt",
            },
            "codeQuality": {
                "hasTests": True,
            },
        },
    ],
    "certificates": [
        {
            "title": "Full Stack Web Development Certificate",
            "issuer": "Coursera",
            "issueDate": "2024-06-15",
        }
    ],
    "github": {
        "repositoryCount": 8,
        "commitCount": 85,
        "contributionActivity": 35,
        "languages": ["JavaScript", "Python", "HTML", "CSS"],
        "stars": 6,
        "forks": 2,
        "readmePresent": True,
        "lastActivity": "2026-07-10T14:00:00Z",
    },
    "resume": {
        "summary": "Junior web developer with focus on React and Node.js.",
    },
}

WEAK_PORTFOLIO = {
    "studentId": "student_weak_003",
    "portfolioId": "portfolio_weak_003",
    "verificationStatus": "VERIFIED",
    "skills": ["HTML", "CSS"],
    "projects": [
        {
            "title": "Static Portfolio Site",
            "description": "Simple HTML and CSS single page layout.",
            "technologies": ["HTML", "CSS"],
        }
    ],
    "certificates": [],
    "github": {
        "repositoryCount": 1,
        "commitCount": 2,
        "languages": ["HTML"],
        "stars": 0,
        "forks": 0,
    },
    "resume": {},
}

EMPTY_PORTFOLIO = {
    "studentId": "student_empty_004",
    "portfolioId": "portfolio_empty_004",
    "verificationStatus": "VERIFIED",
    "skills": [],
    "projects": [],
    "certificates": [],
    "github": {},
    "resume": {},
}


# ---------------------------------------------------------------------------
# Test Category Mapping & Constants
# ---------------------------------------------------------------------------

def test_score_categories_and_weights():
    """Verify weight sum is exactly 1.00 (100%) and category boundaries are correct."""
    weight_sum = sum(SCORING_WEIGHTS.values())
    assert round(weight_sum, 4) == 1.00

    assert SCORING_WEIGHTS["projectComplexity"] == 0.25
    assert SCORING_WEIGHTS["technologyStack"] == 0.20
    assert SCORING_WEIGHTS["githubActivity"] == 0.15
    assert SCORING_WEIGHTS["documentationQuality"] == 0.15
    assert SCORING_WEIGHTS["innovation"] == 0.15
    assert SCORING_WEIGHTS["codeQuality"] == 0.10

    assert get_score_category(100.0) == "Excellent"
    assert get_score_category(90.0) == "Excellent"
    assert get_score_category(89.99) == "Very Good"
    assert get_score_category(80.0) == "Very Good"
    assert get_score_category(79.99) == "Good"
    assert get_score_category(70.0) == "Good"
    assert get_score_category(69.99) == "Average"
    assert get_score_category(60.0) == "Average"
    assert get_score_category(59.99) == "Needs Improvement"
    assert get_score_category(0.0) == "Needs Improvement"


# ---------------------------------------------------------------------------
# Unit Tests for Individual Dimensions
# ---------------------------------------------------------------------------

def test_project_complexity_scorer():
    """Test project complexity scoring for rich and empty portfolios."""
    strong_res = score_project_complexity(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0
    assert len(strong_res["evidence"]) > 0
    assert isinstance(strong_res["explanation"], str)

    empty_res = score_project_complexity(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0
    assert "No verified projects" in empty_res["evidence"][0]


def test_technology_stack_scorer():
    """Test technology stack scoring across diversity, tiers, and certs."""
    strong_res = score_technology_stack(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0
    assert any("diversity" in e.lower() for e in strong_res["evidence"])

    empty_res = score_technology_stack(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0


def test_github_activity_scorer():
    """Test GitHub activity scoring based on commits, repos, and community engagement."""
    strong_res = score_github_activity(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0

    empty_res = score_github_activity(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0


def test_documentation_quality_scorer():
    """Test documentation quality scoring based on README, setup, API, and architecture docs."""
    strong_res = score_documentation_quality(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0

    empty_res = score_documentation_quality(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0


def test_innovation_scorer():
    """Test innovation scoring based on domain specificity, integrations, and live impact."""
    strong_res = score_innovation(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0

    empty_res = score_innovation(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0


def test_code_quality_scorer():
    """Test code quality scoring from testing, coverage, CI/CD, and lint status."""
    strong_res = score_code_quality(STRONG_PORTFOLIO)
    assert 70.0 <= strong_res["score"] <= 100.0

    empty_res = score_code_quality(EMPTY_PORTFOLIO)
    assert empty_res["score"] == 0.0


# ---------------------------------------------------------------------------
# Relative Portfolio Fixtures Ranking: Strong > Average > Weak
# ---------------------------------------------------------------------------

def test_portfolio_score_ordering():
    """Verify that Strong > Average > Weak portfolios are ranked correctly and deterministically."""
    strong_eval = evaluate_portfolio_score(STRONG_PORTFOLIO)
    avg_eval = evaluate_portfolio_score(AVERAGE_PORTFOLIO)
    weak_eval = evaluate_portfolio_score(WEAK_PORTFOLIO)
    empty_eval = evaluate_portfolio_score(EMPTY_PORTFOLIO)

    score_strong = strong_eval["portfolioScore"]
    score_avg = avg_eval["portfolioScore"]
    score_weak = weak_eval["portfolioScore"]
    score_empty = empty_eval["portfolioScore"]

    # Verify monotonic ordering: Strong > Average > Weak > Empty
    assert score_strong > score_avg, f"Expected strong ({score_strong}) > avg ({score_avg})"
    assert score_avg > score_weak, f"Expected avg ({score_avg}) > weak ({score_weak})"
    assert score_weak >= score_empty, f"Expected weak ({score_weak}) >= empty ({score_empty})"

    # Verify score categories
    assert strong_eval["category"] in ["Excellent", "Very Good"]
    assert avg_eval["category"] in ["Good", "Average"]
    assert weak_eval["category"] in ["Needs Improvement"]
    assert empty_eval["category"] == "Needs Improvement"

    # Verify breakdown structure
    for eval_res in [strong_eval, avg_eval, weak_eval, empty_eval]:
        assert "portfolioScore" in eval_res
        assert "category" in eval_res
        assert "breakdown" in eval_res
        assert "evaluatedAt" in eval_res
        assert eval_res["version"] == SCORING_VERSION

        breakdown = eval_res["breakdown"]
        dimensions = ["projectComplexity", "technologyStack", "githubActivity", "documentationQuality", "innovation", "codeQuality"]
        for dim in dimensions:
            assert dim in breakdown
            dim_data = breakdown[dim]
            assert 0.0 <= dim_data["score"] <= 100.0
            assert 0.0 <= dim_data["weightedScore"] <= 100.0
            assert isinstance(dim_data["evidence"], list)
            assert isinstance(dim_data["explanation"], str)


def test_score_boundary_conditions():
    """Verify that scores can never exceed 100 or fall below 0 under extreme payloads."""
    # Maximum extreme payload
    max_payload = {
        **STRONG_PORTFOLIO,
        "skills": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        "certificates": [{"title": f"Cert {i}"} for i in range(10)],
        "github": {
            "repositoryCount": 500,
            "commitCount": 10000,
            "contributionActivity": 5000,
            "languages": ["Python", "TypeScript", "Go", "Rust", "C++", "Java"],
            "stars": 1000,
            "forks": 500,
            "readmePresent": True,
            "lastActivity": "2026-08-27T00:00:00Z",
        },
    }

    max_eval = evaluate_portfolio_score(max_payload)
    assert 0.0 <= max_eval["portfolioScore"] <= 100.0

    # Minimal / empty payload
    min_eval = evaluate_portfolio_score(EMPTY_PORTFOLIO)
    assert min_eval["portfolioScore"] == 0.0
    assert 0.0 <= min_eval["portfolioScore"] <= 100.0
