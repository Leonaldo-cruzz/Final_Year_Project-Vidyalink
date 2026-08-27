"""Deterministic, explainable aggregation for Industry Readiness."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from app.schemas.readiness import (
    DimensionResult,
    IndustryReadinessRequest,
    IndustryReadinessResultData,
    SkillEvidenceInput,
)
from app.services.readiness.config import (
    CATEGORY_RANGES,
    GITHUB_SUBWEIGHTS,
    SCORING_VERSION,
    SKILL_SUBWEIGHTS,
    WEIGHTS,
)


def clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, float(value)))


def rounded(value: float) -> float:
    return round(clamp(value), 2)


def _dimension(
    name: str,
    score: float,
    evidence: list[str],
    explanation: str,
    details: dict[str, Any] | None = None,
) -> DimensionResult:
    return DimensionResult(
        score=rounded(score),
        weight=WEIGHTS[name],
        weightedScore=rounded(score * WEIGHTS[name] / 100),
        evidence=list(dict.fromkeys(evidence)),
        explanation=explanation,
        details=details or {},
    )


def _number(value: Any, default: float = 0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if number == number else default


def _breakdown_evidence(breakdown: dict[str, Any]) -> list[str]:
    """Return only evidence-like text already produced by a source evaluator."""

    found: list[str] = []
    if not isinstance(breakdown, dict):
        return found

    for key, value in breakdown.items():
        if key.lower() in {"evidence", "observations", "reasons"} and isinstance(value, list):
            found.extend(str(item).strip() for item in value if str(item).strip())
        elif isinstance(value, dict):
            found.extend(_breakdown_evidence(value))
    return list(dict.fromkeys(found))


def _portfolio_quality(request: IndustryReadinessRequest) -> DimensionResult:
    evaluation = request.portfolioEvaluation
    score = clamp(evaluation.portfolioScore)
    evidence = [f"Stored portfolio evaluation score: {score:g}/100."]
    evidence.extend(_breakdown_evidence(evaluation.breakdown))
    if not evaluation.breakdown:
        evidence.append("No additional portfolio breakdown evidence was supplied.")
    return _dimension(
        "portfolioQuality",
        score,
        evidence,
        "Uses the stored portfolio evaluator score without recomputing portfolio quality.",
        {"sourceScore": score, "sourceVersion": evaluation.scoringVersion or evaluation.version},
    )


def _ats_readiness(request: IndustryReadinessRequest) -> DimensionResult:
    evaluation = request.atsEvaluation
    score = clamp(evaluation.atsScore)
    evidence = [f"Stored ATS evaluation score: {score:g}/100."]
    evidence.extend(_breakdown_evidence(evaluation.breakdown))
    if not evaluation.breakdown:
        evidence.append("No additional ATS breakdown evidence was supplied.")
    return _dimension(
        "atsReadiness",
        score,
        evidence,
        "Uses the stored ATS evaluator score without recalculating resume analysis.",
        {"sourceScore": score, "sourceVersion": evaluation.scoringVersion or evaluation.version},
    )


def _as_skill_record(skill: str | SkillEvidenceInput) -> dict[str, Any]:
    if isinstance(skill, str):
        return {
            "name": skill.strip(),
            # A named record from the trusted skill-profile evaluator is a
            # low-confidence signal, but it is not treated as demonstrated
            # proficiency without independent evidence.
            "sources": ["skill_profile"],
            "evidence": ["Named skill recorded by the trusted skill profile."],
            "evidenceCount": 0,
            "confidence": 0.25,
            "verified": True,
        }
    return skill.model_dump()


def _source_matches(sources: list[str], *terms: str) -> bool:
    normalized = [str(source).lower() for source in sources]
    return any(any(term in source for term in terms) for source in normalized)


def _technical_skill_profile(request: IndustryReadinessRequest) -> DimensionResult:
    records = [_as_skill_record(skill) for skill in request.skillProfile.skills]
    records = [record for record in records if record.get("verified", True) and record.get("name", "").strip()]
    strengths: list[float] = []
    skill_evidence: list[str] = []
    evidence_backed_count = 0

    for record in records:
        sources = [str(source) for source in record.get("sources", []) if str(source).strip()]
        project_usage = bool(record.get("verifiedProjectUsage")) or _source_matches(
            sources, "project", "portfolio", "milestone"
        )
        github_evidence = bool(record.get("githubEvidence")) or _source_matches(sources, "github", "repository")
        certificate_evidence = bool(record.get("certificateEvidence")) or _source_matches(
            sources, "certificate", "certification"
        )
        alumni_endorsements = bool(record.get("alumniEndorsements")) or _source_matches(
            sources, "alumni", "endorsement", "mentor"
        )
        confidence = clamp(_number(record.get("confidence")) * 100)
        source_breadth = min(len(set(sources)) / 4, 1) * 100
        strength = (
            confidence * SKILL_SUBWEIGHTS["confidence"] / 100
            + source_breadth * SKILL_SUBWEIGHTS["independentSources"] / 100
            + (100 if project_usage else 0) * SKILL_SUBWEIGHTS["verifiedProjectUsage"] / 100
            + (100 if github_evidence else 0) * SKILL_SUBWEIGHTS["githubEvidence"] / 100
            + (100 if certificate_evidence else 0) * SKILL_SUBWEIGHTS["certificateEvidence"] / 100
            + (100 if alumni_endorsements else 0) * SKILL_SUBWEIGHTS["alumniEndorsements"] / 100
        )
        strengths.append(strength)
        if sources or record.get("evidence") or record.get("evidenceCount", 0) > 0:
            evidence_backed_count += 1
        source_text = ", ".join(sources) if sources else "no independent source recorded"
        skill_evidence.append(
            f"{record['name']} has {confidence:g}% confidence across {len(set(sources))} source(s) ({source_text})."
        )

    if not strengths:
        score = 0
        evidence = ["No verified skill evidence was supplied."]
    else:
        average_strength = sum(strengths) / len(strengths)
        coverage_factor = min(len(strengths) / 5, 1)
        # Skill count has only a modest effect; evidence strength remains dominant.
        score = average_strength * (0.65 + 0.35 * coverage_factor)
        evidence = skill_evidence

    return _dimension(
        "technicalSkillProfile",
        score,
        evidence,
        "Averages evidence strength per demonstrated skill; skill count is a modest coverage factor, not a proficiency proxy.",
        {
            "demonstratedSkillCount": len(records),
            "evidenceBackedSkillCount": evidence_backed_count,
            "skillSubweights": SKILL_SUBWEIGHTS,
        },
    )


def _github_evidence(request: IndustryReadinessRequest) -> DimensionResult:
    github = request.githubAnalytics
    repositories = github.repositoryCount
    active = min(github.activeRepositoryCount, repositories) if repositories else 0
    active_ratio = active / repositories if repositories else 0
    repository_activity = (active_ratio * 50) + (min(repositories / 10, 1) * 50)
    recent_activity = min(github.recentCommitCount / 30, 1) * 100
    commit_evidence = min(github.commitCount / 300, 1) * 100
    language_usage = min(len(set(language.lower() for language in github.languages if language.strip())) / 5, 1) * 100
    documentation = (github.readmeCoverage + github.documentationCoverage) / 2
    score = (
        repository_activity * GITHUB_SUBWEIGHTS["repositoryActivity"] / 100
        + recent_activity * GITHUB_SUBWEIGHTS["recentActivity"] / 100
        + commit_evidence * GITHUB_SUBWEIGHTS["commitEvidence"] / 100
        + language_usage * GITHUB_SUBWEIGHTS["languageUsage"] / 100
        + documentation * GITHUB_SUBWEIGHTS["documentation"] / 100
    )
    evidence = [
        f"{repositories} public repositories recorded; {active} active repository/repositories.",
        f"{github.commitCount} total commits and {github.recentCommitCount} recent commits recorded.",
        f"README coverage is {github.readmeCoverage:g}% and documentation coverage is {github.documentationCoverage:g}%.",
    ]
    if github.languages:
        evidence.append(f"Language usage observed across {len(set(github.languages))} language(s).")
    if not repositories and not github.commitCount and not github.languages:
        evidence = ["No verified GitHub analytics were supplied."]
    return _dimension(
        "githubEvidence",
        score,
        evidence,
        "Measures repository activity, recent commits, commit evidence, language breadth, and documentation; stars and forks are not used.",
        {
            "repositoryActivity": rounded(repository_activity),
            "recentActivity": rounded(recent_activity),
            "commitEvidence": rounded(commit_evidence),
            "languageUsage": rounded(language_usage),
            "documentation": rounded(documentation),
            "subweights": GITHUB_SUBWEIGHTS,
        },
    )


def _verified_achievements(request: IndustryReadinessRequest) -> DimensionResult:
    achievements = [item for item in request.verifiedAchievements if item.verified]
    counts: dict[str, int] = {"project": 0, "certificate": 0, "github": 0, "endorsement": 0}
    evidence: list[str] = []

    for achievement in achievements:
        kind = achievement.type.lower()
        if "project" in kind or "portfolio" in kind:
            counts["project"] += 1
        elif "certificate" in kind or "certification" in kind:
            counts["certificate"] += 1
        elif "github" in kind or "repository" in kind:
            counts["github"] += 1
        elif "endorsement" in kind or "alumni" in kind or "mentor" in kind:
            counts["endorsement"] += 1
        evidence.append(achievement.label)
        evidence.extend(achievement.evidence)

    score = (
        min(counts["project"] / 3, 1) * 45
        + min(counts["certificate"] / 3, 1) * 25
        + min(counts["github"], 1) * 20
        + min(counts["endorsement"] / 2, 1) * 10
    )
    if not achievements:
        evidence = ["No verified achievement evidence was supplied."]
    return _dimension(
        "verifiedAchievements",
        score,
        evidence,
        "Rewards only explicitly verified projects, certificates, GitHub associations, and endorsements.",
        {"verifiedAchievementCount": len(achievements), "countsByType": counts},
    )


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9+#.]+", value.lower()) if len(token) > 2}


def _career_alignment(request: IndustryReadinessRequest) -> DimensionResult:
    gap = request.skillGapAnalysis
    target_role = gap.targetRole.strip()
    matched_required = sum(
        1
        for skill in gap.matchedSkills
        if not isinstance(skill, str) and skill.isRequired
    )
    matched_preferred = sum(
        1
        for skill in gap.matchedSkills
        if not isinstance(skill, str) and not skill.isRequired
    )
    required_total = matched_required + len(gap.missingRequiredSkills)
    preferred_total = matched_preferred + len(gap.missingPreferredSkills)
    required_coverage = matched_required / required_total * 100 if required_total else 0
    preferred_coverage = matched_preferred / preferred_total * 100 if preferred_total else 0

    if gap.projectRelevance is not None:
        project_relevance = clamp(gap.projectRelevance)
    else:
        role_tokens = _tokens(target_role)
        project_tokens = _tokens(
            " ".join([gap.portfolioDomain, gap.projectTitle, *gap.projectTechnologies])
        )
        project_relevance = len(role_tokens & project_tokens) / len(role_tokens) * 100 if role_tokens else 0

    role_signal = 100 if target_role else 0
    score = role_signal * 15 / 100 + required_coverage * 50 / 100 + preferred_coverage * 15 / 100 + project_relevance * 20 / 100
    evidence = []
    if target_role:
        evidence.append(f"Target role evaluated: {target_role}.")
    if required_total:
        evidence.append(f"Matched {matched_required} of {required_total} required skills.")
    if preferred_total:
        evidence.append(f"Matched {matched_preferred} of {preferred_total} preferred skills.")
    if gap.portfolioDomain or gap.projectTitle or gap.projectTechnologies:
        evidence.append(
            f"Project relevance evidence uses domain '{gap.portfolioDomain}', title '{gap.projectTitle}', and {len(gap.projectTechnologies)} technology/technologies."
        )
    if not evidence:
        evidence = ["No target-role or project-alignment evidence was supplied."]
    return _dimension(
        "careerAlignment",
        score,
        evidence,
        "Combines target-role presence, required/preferred skill coverage, and project relevance evidence.",
        {
            "targetRole": target_role,
            "requiredCoverage": rounded(required_coverage),
            "preferredCoverage": rounded(preferred_coverage),
            "projectRelevance": rounded(project_relevance),
        },
    )


def _priority(recommendation: Any) -> int:
    if not isinstance(recommendation, dict):
        return 0
    priority = str(recommendation.get("priority", "")).upper()
    return {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(priority, 0)


def _top_recommendations(recommendations: list[Any]) -> list[Any]:
    # Stable sort preserves the Recommendation Engine's ordering within a priority.
    return sorted(recommendations, key=_priority, reverse=True)[:5]


def category_for_score(score: float) -> str:
    """Map a clamped score to the versioned category ranges."""

    value = clamp(score)
    for category, (lower_bound, upper_bound) in CATEGORY_RANGES.items():
        if lower_bound <= value <= upper_bound and (category == "Highly Industry Ready" or value < upper_bound):
            return category
    return "Needs Development"


def _insights(request: IndustryReadinessRequest, breakdown: dict[str, DimensionResult]) -> tuple[list[str], list[str]]:
    strengths: list[str] = []
    gaps: list[str] = []
    portfolio = breakdown["portfolioQuality"]
    skills = breakdown["technicalSkillProfile"]
    github = breakdown["githubEvidence"]
    ats = breakdown["atsReadiness"]
    achievements = breakdown["verifiedAchievements"]
    career = breakdown["careerAlignment"]

    if portfolio.score >= 80:
        strengths.append(f"Strong portfolio evaluation evidence ({portfolio.score:g}/100).")
    if ats.score >= 80:
        strengths.append(f"High ATS compatibility ({ats.score:g}/100).")
    if github.score >= 70 and request.githubAnalytics.repositoryCount > 0:
        strengths.append(
            f"Good GitHub activity ({request.githubAnalytics.repositoryCount} repositories, {request.githubAnalytics.recentCommitCount} recent commits)."
        )
    if skills.score >= 70:
        demonstrated = [
            skill.name
            for skill in request.skillProfile.skills
            if isinstance(skill, SkillEvidenceInput) and skill.verified and skill.name
        ]
        if demonstrated:
            strengths.append(f"Strong evidence for {', '.join(demonstrated[:3])}.")
        else:
            strengths.append(f"Evidence-backed technical skill profile ({skills.score:g}/100).")
    if achievements.score >= 70:
        strengths.append(f"Verified achievement evidence is strong ({achievements.score:g}/100).")
    if career.score >= 70:
        strengths.append(f"Good alignment with the selected target role ({career.score:g}/100).")

    gap = request.skillGapAnalysis
    if gap.missingRequiredSkills:
        gaps.append(f"Missing required skills: {', '.join(gap.missingRequiredSkills[:5])}.")
    if gap.missingPreferredSkills:
        gaps.append(f"Missing preferred skills: {', '.join(gap.missingPreferredSkills[:5])}.")
    if gap.weakEvidenceSkills:
        names = [item if isinstance(item, str) else item.name for item in gap.weakEvidenceSkills]
        gaps.append(f"Weak evidence for: {', '.join(name for name in names if name)[:200]}.")
    if request.githubAnalytics.repositoryCount and request.githubAnalytics.recentCommitCount < 3:
        gaps.append(f"Low recent GitHub activity ({request.githubAnalytics.recentCommitCount} recent commits recorded).")
    if request.githubAnalytics.repositoryCount and (
        request.githubAnalytics.readmeCoverage < 60 or request.githubAnalytics.documentationCoverage < 60
    ):
        gaps.append(
            f"Low GitHub documentation quality (README {request.githubAnalytics.readmeCoverage:g}%, documentation {request.githubAnalytics.documentationCoverage:g}%)."
        )
    if skills.score < 60 and not gap.weakEvidenceSkills and not gap.missingRequiredSkills:
        gaps.append("Limited verified technical skill evidence.")
    if achievements.score == 0:
        gaps.append("No verified achievements were supplied.")
    if career.score < 60:
        gaps.append("Limited target-role alignment evidence.")
    if not strengths and not gaps:
        gaps.append("No strong verified readiness signal was found in the supplied evidence.")
    return list(dict.fromkeys(strengths)), list(dict.fromkeys(gaps))


def calculate_industry_readiness(request: IndustryReadinessRequest | dict[str, Any]) -> IndustryReadinessResultData:
    """Calculate a repeatable score from already-generated source signals."""

    if not isinstance(request, IndustryReadinessRequest):
        request = IndustryReadinessRequest.model_validate(request)

    dimensions = {
        "portfolioQuality": _portfolio_quality(request),
        "technicalSkillProfile": _technical_skill_profile(request),
        "githubEvidence": _github_evidence(request),
        "atsReadiness": _ats_readiness(request),
        "verifiedAchievements": _verified_achievements(request),
        "careerAlignment": _career_alignment(request),
    }
    final_score = rounded(sum(dimension.weightedScore for dimension in dimensions.values()))
    category = category_for_score(final_score)
    strengths, gaps = _insights(request, dimensions)
    source_versions = {
        "portfolioEvaluationVersion": request.portfolioEvaluation.scoringVersion or request.portfolioEvaluation.version,
        "atsEvaluationVersion": request.atsEvaluation.scoringVersion or request.atsEvaluation.version,
        "githubAnalyticsVersion": request.githubAnalytics.analyticsVersion,
        "skillProfileVersion": request.skillProfile.version,
        "skillGapAnalysisVersion": request.skillGapAnalysis.analysisVersion,
    }
    return IndustryReadinessResultData(
        industryReadinessScore=final_score,
        category=category,
        breakdown=dimensions,
        strengths=strengths,
        gaps=gaps,
        topRecommendations=_top_recommendations(request.recommendations),
        scoringVersion=SCORING_VERSION,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        sourceVersions=source_versions,
    )
