"""Explainable deterministic portfolio scoring."""

from __future__ import annotations

import re
from typing import Any

from src.models.portfolio import PortfolioSubmission, Project, ProjectEvaluation
from src.models.scoring import PortfolioEvaluation
from src.utils.scoring import category_for_score, clamp, rounded


PORTFOLIO_WEIGHTS = {
    "complexity": 0.25,
    "technology_stack": 0.20,
    "github_activity": 0.15,
    "documentation_quality": 0.15,
    "innovation": 0.15,
    "code_quality": 0.10,
}


def _as_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(str(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(str(item) for item in value)
    return ""


def _indicator_count(value: Any) -> int:
    if isinstance(value, dict):
        return sum(1 for item in value.values() if item not in (None, False, 0, "", []))
    if isinstance(value, list):
        return len([item for item in value if str(item).strip()])
    return 1 if str(value).strip() else 0


def _keyword_count(text: str, keywords: tuple[str, ...]) -> int:
    lower = text.casefold()
    return sum(1 for keyword in keywords if re.search(rf"(?<!\w){re.escape(keyword)}(?!\w)", lower))


def _project_scores(project: Project) -> dict[str, float]:
    description = project.description or ""
    documentation = _as_text(project.documentation)
    quality_text = " ".join(
        [description, documentation, _as_text(project.code_quality_indicators)]
    )
    innovation_text = " ".join([description, _as_text(project.innovation_indicators)])
    complexity_text = " ".join([description, _as_text(project.complexity_indicators)])

    complexity = 20 + min(len(project.technologies), 8) * 7
    complexity += min(_indicator_count(project.complexity_indicators), 5) * 8
    complexity += min(_keyword_count(complexity_text, ("api", "database", "distributed", "real-time", "scalable", "pipeline")), 4) * 5
    complexity += 10 if len(description) >= 240 else 0

    technology = 15 + min(len(set(project.technologies)), 8) * 9
    technology += min(len({item.split(".")[0].casefold() for item in project.technologies}), 4) * 4

    github = 65 if project.github_url else 0
    if project.github_url and _keyword_count(description, ("commit", "pull request", "version control")):
        github += 15

    documentation_score = 0
    if documentation:
        documentation_score = 45 + min(len(documentation), 1200) / 40
        documentation_score += min(_keyword_count(documentation, ("installation", "usage", "architecture", "testing", "api")), 5) * 5
    elif project.github_url:
        documentation_score = 20

    innovation = min(100, _indicator_count(project.innovation_indicators) * 20)
    innovation += min(_keyword_count(innovation_text, ("novel", "innovative", "optimization", "automation", "prototype", "impact")), 5) * 8

    code_quality = min(_indicator_count(project.code_quality_indicators) * 18, 60)
    code_quality += min(_keyword_count(quality_text, ("test", "testing", "lint", "ci", "review", "clean code", "type-safe")), 5) * 8

    return {
        "complexity": clamp(complexity),
        "technology_stack": clamp(technology),
        "github_activity": clamp(github),
        "documentation_quality": clamp(documentation_score),
        "innovation": clamp(innovation),
        "code_quality": clamp(code_quality),
    }


def evaluate_project(project: Project) -> ProjectEvaluation:
    """Evaluate an individual project deterministically based on available evidence."""
    scores = _project_scores(project)
    project_score = rounded(
        sum(scores[component] * weight for component, weight in PORTFOLIO_WEIGHTS.items())
    )
    evidence: list[str] = []
    if project.description:
        evidence.append(f"Supplied project description ({len(project.description)} characters)")
    if project.technologies:
        evidence.append(f"{len(project.technologies)} supplied technologies: {', '.join(project.technologies[:5])}")
    if project.github_url:
        evidence.append("GitHub repository linked")
    dep_url = project.deployment_url or project.demo_url
    if dep_url:
        status_suffix = f" (status: {project.deployment_status})" if project.deployment_status else ""
        evidence.append(f"Live deployment supplied{status_suffix}")
    if project.documentation:
        evidence.append("Project documentation supplied")
    if _indicator_count(project.complexity_indicators):
        evidence.append("Complexity indicators identified")
    if _indicator_count(project.innovation_indicators):
        evidence.append("Innovation indicators identified")
    if _indicator_count(project.code_quality_indicators):
        evidence.append("Code-quality indicators identified")

    strengths = [
        f"{c.replace('_', ' ').title()} is strong ({scores[c]:.0f}/100)."
        for c, w in PORTFOLIO_WEIGHTS.items()
        if scores[c] >= 70
    ]
    improvements = [
        f"Strengthen {c.replace('_', ' ')}; currently {scores[c]:.0f}/100."
        for c, w in PORTFOLIO_WEIGHTS.items()
        if scores[c] < 70
    ]
    return ProjectEvaluation(
        title=project.title,
        project_score=project_score,
        component_scores=scores,
        evidence=evidence,
        strengths=strengths,
        improvements=improvements,
        deployment_url=dep_url,
        deployment_status=project.deployment_status,
        github_url=project.github_url,
    )


def _average_scores(projects: list[Project]) -> dict[str, float]:
    if not projects:
        return {name: 0.0 for name in PORTFOLIO_WEIGHTS}
    scores = [_project_scores(project) for project in projects]
    return {
        component: rounded(sum(score[component] for score in scores) / len(scores))
        for component in PORTFOLIO_WEIGHTS
    }


def evaluate_portfolio(portfolio: PortfolioSubmission) -> PortfolioEvaluation:
    verified_projects = [project for project in portfolio.projects if project.is_verified]
    excluded_count = len(portfolio.projects) - len(verified_projects)
    project_evaluations = [evaluate_project(project) for project in verified_projects]
    components = _average_scores(verified_projects)

    # Supplied GitHub activity is factual evidence for the portfolio-level
    # component; it never upgrades the other components.
    if portfolio.github and verified_projects:
        github = portfolio.github
        activity = min(github.repository_count, 10) * 4
        activity += min(github.commit_count, 100) * 0.25
        if github.recent_activity:
            activity += 15
        if github.contribution_activity is not None:
            activity += github.contribution_activity * 0.2
        components["github_activity"] = rounded(max(components["github_activity"], activity))

    breakdown = {
        component: rounded(components[component] * weight)
        for component, weight in PORTFOLIO_WEIGHTS.items()
    }
    overall = rounded(sum(breakdown.values()))
    evidence = {
        "complexity": [],
        "technology_stack": [],
        "github_activity": [],
        "documentation_quality": [],
        "innovation": [],
        "code_quality": [],
    }
    for project in verified_projects:
        if project.description:
            evidence["complexity"].append(f"{project.title}: supplied project description ({len(project.description)} characters)")
        if project.technologies:
            evidence["technology_stack"].append(f"{project.title}: {len(project.technologies)} supplied technologies")
        if project.github_url:
            evidence["github_activity"].append(f"{project.title}: supplied GitHub repository URL")
        if portfolio.github:
            github = portfolio.github
            if github.commit_count:
                evidence["github_activity"].append(f"portfolio: {github.commit_count} supplied commits")
            if github.repository_count:
                evidence["github_activity"].append(f"portfolio: {github.repository_count} supplied repositories")
            if github.recent_activity:
                evidence["github_activity"].append("portfolio: supplied recent activity flag")
        if project.documentation:
            evidence["documentation_quality"].append(f"{project.title}: supplied documentation")
        if project.innovation_indicators:
            evidence["innovation"].append(f"{project.title}: supplied innovation indicators")
        if project.code_quality_indicators:
            evidence["code_quality"].append(f"{project.title}: supplied code-quality indicators")
    if not verified_projects:
        evidence = {key: ["No verified project evidence supplied."] for key in evidence}
    strengths = [
        f"{component.replace('_', ' ').title()} is supported by the supplied verified evidence ({components[component]:.0f}/100)."
        for component in PORTFOLIO_WEIGHTS
        if components[component] >= 70
    ]
    suggestions = [
        f"Add stronger verified evidence for {component.replace('_', ' ')}; the current component score is {components[component]:.0f}/100."
        for component in PORTFOLIO_WEIGHTS
        if components[component] < 70
    ]
    evidence_status = "sufficient" if verified_projects else "insufficient_evidence"
    if not verified_projects:
        suggestions.insert(0, "No verified projects were supplied, so the score is not evidence of low ability; verify projects before using it.")
    elif excluded_count:
        suggestions.insert(0, f"{excluded_count} unverified project(s) were excluded from scoring.")

    return PortfolioEvaluation(
        overall_score=overall,
        category=category_for_score(overall),
        component_scores=components,
        weighted_breakdown=breakdown,
        evidence=evidence,
        strengths=strengths,
        improvements=suggestions,
        improvement_suggestions=suggestions,
        data_completeness={
            "total_projects": len(portfolio.projects),
            "verified_projects": len(verified_projects),
            "excluded_unverified_projects": excluded_count,
            "education_supplied": bool(portfolio.education),
            "certificates_supplied": bool(portfolio.certificates),
            "github_metrics_supplied": portfolio.github is not None,
            "resume_supplied": portfolio.resume is not None and bool(portfolio.resume.text.strip()),
            "missing_evidence": [] if verified_projects else ["verified_projects"],
        },
        eligible_project_count=len(verified_projects),
        excluded_project_count=excluded_count,
        evidence_status=evidence_status,
        project_evaluations=project_evaluations,
    )
