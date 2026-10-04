from src.models.portfolio import PortfolioSubmission
from src.services.portfolio_scoring import PORTFOLIO_WEIGHTS, evaluate_portfolio
from src.utils.scoring import category_for_score


def _portfolio() -> PortfolioSubmission:
    return PortfolioSubmission(
        student_id="student-1",
        skills=["Python", "FastAPI"],
        projects=[
            {
                "title": "Verified API",
                "description": "A scalable API with a database, testing, CI, and automation.",
                "technologies": ["Python", "FastAPI", "PostgreSQL"],
                "github_url": "https://github.com/example/api",
                "documentation": "Installation, architecture, usage, API and testing details.",
                "complexity_indicators": ["database", "scalable"],
                "innovation_indicators": ["automation"],
                "code_quality_indicators": ["tests", "CI"],
                "verified": True,
            }
        ],
    )


def test_weights_sum_to_one() -> None:
    assert sum(PORTFOLIO_WEIGHTS.values()) == 1.0


def test_portfolio_score_is_deterministic() -> None:
    first = evaluate_portfolio(_portfolio())
    second = evaluate_portfolio(_portfolio())
    assert first.model_dump() == second.model_dump()
    assert round(sum(first.weighted_breakdown.values()), 2) == first.overall_score
    assert first.eligible_project_count == 1


def test_score_categories_have_official_boundaries() -> None:
    assert category_for_score(90) == "Excellent"
    assert category_for_score(80) == "Very Good"
    assert category_for_score(70) == "Good"
    assert category_for_score(60) == "Average"
    assert category_for_score(59.99) == "Needs Improvement"


def test_unverified_projects_are_excluded_and_marked() -> None:
    portfolio = PortfolioSubmission(projects=[{"title": "Unverified", "description": "Python project", "verified": False}])
    result = evaluate_portfolio(portfolio)
    assert result.overall_score == 0
    assert result.eligible_project_count == 0
    assert result.excluded_project_count == 1
    assert result.evidence_status == "insufficient_evidence"
    assert result.project_evaluations == []


def test_official_weights_exact_values() -> None:
    assert PORTFOLIO_WEIGHTS["complexity"] == 0.25
    assert PORTFOLIO_WEIGHTS["technology_stack"] == 0.20
    assert PORTFOLIO_WEIGHTS["github_activity"] == 0.15
    assert PORTFOLIO_WEIGHTS["documentation_quality"] == 0.15
    assert PORTFOLIO_WEIGHTS["innovation"] == 0.15
    assert PORTFOLIO_WEIGHTS["code_quality"] == 0.10


def test_project_level_evaluation_and_aggregation() -> None:
    from src.services.portfolio_scoring import evaluate_project
    from src.models.portfolio import Project

    project = Project(
        title="Distributed Crawler",
        description="A scalable distributed web crawler with database pipeline and automated tests.",
        technologies=["Python", "FastAPI", "Redis", "PostgreSQL"],
        github_url="https://github.com/example/crawler",
        demo_url="https://crawler.example.com",
        documentation="Complete architecture, installation guide, and API documentation.",
        complexity_indicators=["distributed", "pipeline"],
        innovation_indicators=["automation"],
        code_quality_indicators=["clean code", "tests"],
        verified=True,
    )
    proj_eval = evaluate_project(project)
    assert proj_eval.title == "Distributed Crawler"
    assert 0 <= proj_eval.project_score <= 100
    assert "complexity" in proj_eval.component_scores
    assert len(proj_eval.evidence) > 0
    assert proj_eval.deployment_url == "https://crawler.example.com"
    assert proj_eval.github_url == "https://github.com/example/crawler"

    # Multi-project portfolio evaluation
    portfolio = PortfolioSubmission(
        projects=[
            project,
            Project(
                title="Frontend Dashboard",
                description="Real-time analytics dashboard with React and TypeScript.",
                technologies=["React", "TypeScript", "Tailwind CSS"],
                github_url="https://github.com/example/dashboard",
                verified=True,
            ),
        ]
    )
    result = evaluate_portfolio(portfolio)
    assert len(result.project_evaluations) == 2
    assert result.eligible_project_count == 2
    assert result.project_evaluations[0].title == "Distributed Crawler"
    assert result.project_evaluations[1].title == "Frontend Dashboard"


def test_deterministic_portfolio_score_exact_calculation_fixtures() -> None:
    """Mathematical verification with deterministic test fixtures."""
    # Fixture 1: All components at 100
    comp_100 = {
        "complexity": 100.0,
        "technology_stack": 100.0,
        "github_activity": 100.0,
        "documentation_quality": 100.0,
        "innovation": 100.0,
        "code_quality": 100.0,
    }
    expected_100 = sum(comp_100[c] * PORTFOLIO_WEIGHTS[c] for c in PORTFOLIO_WEIGHTS)
    assert expected_100 == 100.0

    # Fixture 2: Non-trivial weighted values
    # Complexity = 80, Technology = 60, GitHub = 50, Documentation = 40, Innovation = 70, Code Quality = 90
    comp_mixed = {
        "complexity": 80.0,
        "technology_stack": 60.0,
        "github_activity": 50.0,
        "documentation_quality": 40.0,
        "innovation": 70.0,
        "code_quality": 90.0,
    }
    # 80*0.25 + 60*0.20 + 50*0.15 + 40*0.15 + 70*0.15 + 90*0.10
    # = 20.0 + 12.0 + 7.5 + 6.0 + 10.5 + 9.0 = 65.0
    expected_mixed = (
        80.0 * 0.25
        + 60.0 * 0.20
        + 50.0 * 0.15
        + 40.0 * 0.15
        + 70.0 * 0.15
        + 90.0 * 0.10
    )
    assert expected_mixed == 65.0
    calculated_mixed = sum(comp_mixed[c] * PORTFOLIO_WEIGHTS[c] for c in PORTFOLIO_WEIGHTS)
    assert calculated_mixed == 65.0

    # Fixture 3: Second non-trivial fixture
    comp_fixture3 = {
        "complexity": 90.0,
        "technology_stack": 85.0,
        "github_activity": 70.0,
        "documentation_quality": 60.0,
        "innovation": 80.0,
        "code_quality": 75.0,
    }
    # 90*0.25 + 85*0.20 + 70*0.15 + 60*0.15 + 80*0.15 + 75*0.10
    # = 22.5 + 17.0 + 10.5 + 9.0 + 12.0 + 7.5 = 78.5
    expected_f3 = (
        90.0 * 0.25
        + 85.0 * 0.20
        + 70.0 * 0.15
        + 60.0 * 0.15
        + 80.0 * 0.15
        + 75.0 * 0.10
    )
    assert expected_f3 == 78.5
    calculated_f3 = sum(comp_fixture3[c] * PORTFOLIO_WEIGHTS[c] for c in PORTFOLIO_WEIGHTS)
    assert calculated_f3 == 78.5


def test_weights_change_sensitivity() -> None:
    """Verifies that altering any individual weight causes expected score divergence."""
    comp_mixed = {
        "complexity": 80.0,
        "technology_stack": 60.0,
        "github_activity": 50.0,
        "documentation_quality": 40.0,
        "innovation": 70.0,
        "code_quality": 90.0,
    }
    canonical_score = sum(comp_mixed[c] * PORTFOLIO_WEIGHTS[c] for c in PORTFOLIO_WEIGHTS)
    assert canonical_score == 65.0

    # Perturb each weight and assert the result differs from 65.0
    for component in PORTFOLIO_WEIGHTS:
        perturbed_weights = dict(PORTFOLIO_WEIGHTS)
        perturbed_weights[component] += 0.05
        perturbed_score = sum(comp_mixed[c] * perturbed_weights[c] for c in perturbed_weights)
        assert perturbed_score != 65.0, f"Perturbing {component} should change total score"


def test_rejected_legacy_scoring_model_fails_canonical_assert() -> None:
    """Verify that the rejected model does not match the approved canonical model."""
    wrong_model = {
        "technical_skills": 0.25,
        "project_quality": 0.20,
        "github_activity": 0.15,
        "certifications": 0.15,
        "academic_background": 0.15,
        "leadership_extras": 0.10,
    }
    assert set(wrong_model.keys()) != set(PORTFOLIO_WEIGHTS.keys())
    assert "complexity" not in wrong_model
    assert "documentation_quality" not in wrong_model
    assert "innovation" not in wrong_model
    assert "code_quality" not in wrong_model

