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


