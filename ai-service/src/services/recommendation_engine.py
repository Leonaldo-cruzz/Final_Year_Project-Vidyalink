"""Deterministic, explainable recommendation engine over real candidates."""

from src.models.portfolio import RecommendationCandidate, RecommendationsRequest
from src.models.scoring import RecommendationItem, RecommendationsResponse
from src.services.skill_analysis import canonicalize_skill
from src.utils.scoring import rounded


def _normalized(values: list[str]) -> set[str]:
    return {canonicalize_skill(value) or value.strip().casefold() for value in values if value and value.strip()}


def _rank_alumni(candidate: RecommendationCandidate, request: RecommendationsRequest) -> RecommendationItem | None:
    student_skills = _normalized(request.technical_skills + request.technologies)
    candidate_skills = _normalized(candidate.skills)
    matched_skills = sorted(student_skills & candidate_skills)

    student_domains = _normalized(
        request.career_interests
        + request.project_domains
        + ([request.project_domain] if request.project_domain else [])
    )
    candidate_domains = _normalized(candidate.domains)
    matched_domains = sorted(d.title() for d in (student_domains & candidate_domains))

    # If there is no overlap in skills or domains, do not fabricate a recommendation
    if not matched_skills and not matched_domains:
        return None

    # Deterministic scoring
    skill_score = min(len(matched_skills) * 15.0, 55.0)
    domain_score = min(len(matched_domains) * 12.5, 25.0)

    grad_score = 0.0
    if request.graduation_year and candidate.graduation_year:
        diff = abs(request.graduation_year - candidate.graduation_year)
        if diff <= 5:
            grad_score = 10.0
        elif diff <= 10:
            grad_score = 5.0
        else:
            grad_score = 2.0

    pf_score = 0.0
    if request.portfolio_score is not None:
        pf_score = (request.portfolio_score / 100.0) * 10.0

    total_score = rounded(min(skill_score + domain_score + grad_score + pf_score, 100.0))

    matched_signals: list[str] = []
    if matched_skills:
        plural = "s" if len(matched_skills) > 1 else ""
        matched_signals.append(f"{len(matched_skills)} matching technical skill{plural} ({', '.join(matched_skills)})")
    if matched_domains:
        matched_signals.append(f"Matching domain/career interest ({', '.join(matched_domains)})")
    if grad_score > 0 and candidate.graduation_year:
        matched_signals.append(f"Relevant graduating cohort ({candidate.graduation_year})")
    if pf_score > 0:
        matched_signals.append("Verified portfolio compatibility")

    reasons: list[str] = []
    if matched_skills and matched_domains:
        reasons.append(f"strong overlap in {', '.join(matched_skills)} and shared interests in {', '.join(matched_domains)}")
    elif matched_skills:
        reasons.append(f"technical skill overlap in {', '.join(matched_skills)}")
    elif matched_domains:
        reasons.append(f"shared domain interests in {', '.join(matched_domains)}")

    if grad_score >= 10.0:
        reasons.append("recent alumni from a relevant graduating cohort")

    reason_str = "Recommended because of " + "; ".join(reasons) + "."

    return RecommendationItem(
        id=candidate.id,
        name=candidate.name,
        title=candidate.title,
        organization=candidate.organization,
        match_score=total_score,
        matchScore=total_score,
        reason=reason_str,
        alumni_id=candidate.id,
        alumniId=candidate.id,
        matched_signals=matched_signals,
        matchedSignals=matched_signals,
        matched_skills=matched_skills,
        matchedSkills=matched_skills,
        missing_skills=[],
        missingSkills=[],
    )


def _rank_opportunity(candidate: RecommendationCandidate, request: RecommendationsRequest) -> RecommendationItem | None:
    student_skills = _normalized(request.technical_skills + request.technologies)
    opp_skills = _normalized(candidate.skills + candidate.required_skills)
    matched_skills = sorted(student_skills & opp_skills)
    missing_skills = sorted(opp_skills - student_skills)

    student_domains = _normalized(
        request.career_interests
        + request.project_domains
        + ([request.project_domain] if request.project_domain else [])
    )
    opp_domains = _normalized(candidate.domains)
    matched_domains = sorted(d.title() for d in (student_domains & opp_domains))

    # If no skill or domain overlap, return None
    if not matched_skills and not matched_domains:
        return None

    if opp_skills:
        skill_cov_ratio = len(matched_skills) / len(opp_skills)
        skill_score = skill_cov_ratio * 60.0
    else:
        skill_score = 0.0

    domain_score = min(len(matched_domains) * 15.0, 25.0)

    pf_score = 0.0
    if request.portfolio_score is not None:
        pf_score = (request.portfolio_score / 100.0) * 15.0

    total_score = rounded(min(skill_score + domain_score + pf_score, 100.0))

    matched_signals: list[str] = []
    if matched_skills:
        plural = "s" if len(matched_skills) > 1 else ""
        matched_signals.append(f"{len(matched_skills)} required skill{plural} matched ({', '.join(matched_skills)})")
    if missing_skills:
        plural = "s" if len(missing_skills) > 1 else ""
        matched_signals.append(f"{len(missing_skills)} skill{plural} to develop ({', '.join(missing_skills)})")
    if matched_domains:
        matched_signals.append(f"Matching domain ({', '.join(matched_domains)})")
    if pf_score > 0:
        matched_signals.append("Supported by verified portfolio score")

    reason_parts: list[str] = []
    if matched_skills:
        reason_parts.append(f"matches required skills ({', '.join(matched_skills)})")
    if matched_domains:
        reason_parts.append(f"aligns with domain ({', '.join(matched_domains)})")
    if missing_skills:
        reason_parts.append(f"offers opportunity to develop {', '.join(missing_skills[:3])}")

    reason_str = "Recommended because it " + "; ".join(reason_parts) + "."

    return RecommendationItem(
        id=candidate.id,
        name=candidate.name,
        title=candidate.title,
        organization=candidate.organization,
        match_score=total_score,
        matchScore=total_score,
        reason=reason_str,
        opportunity_id=candidate.id,
        opportunityId=candidate.id,
        matched_signals=matched_signals,
        matchedSignals=matched_signals,
        matched_skills=matched_skills,
        matchedSkills=matched_skills,
        missing_skills=missing_skills,
        missingSkills=missing_skills,
    )


def recommend(request: RecommendationsRequest) -> RecommendationsResponse:
    raw_mentors = [
        mentor
        for candidate in request.available_alumni_mentors
        if (mentor := _rank_alumni(candidate, request)) is not None
    ]
    mentors = sorted(raw_mentors, key=lambda item: (-item.match_score, item.name.casefold()))

    raw_opportunities = [
        opp
        for candidate in request.available_job_opportunities
        if (opp := _rank_opportunity(candidate, request)) is not None
    ]
    opportunities = sorted(raw_opportunities, key=lambda item: (-item.match_score, item.name.casefold()))

    student_skills = _normalized(request.technical_skills + request.technologies)
    missing = [skill for skill in request.target_skills if (canonicalize_skill(skill) or skill.strip().casefold()) not in student_skills]
    skills_to_develop = [
        {
            "skill": skill,
            "priority": "high" if index < 2 else "medium",
            "reason": "Listed as target skill but not yet evidenced in student profile or verified projects",
        }
        for index, skill in enumerate(dict.fromkeys(missing))
    ]

    notes = [
        "Recommendations are ranked only from actual candidate records supplied in this request.",
        "No external people, employers, or opportunities were invented.",
    ]
    if not request.available_alumni_mentors:
        notes.append("No alumni mentor records were supplied.")
    elif not mentors:
        notes.append("No matching alumni found based on current skills and interests.")

    if not request.available_job_opportunities:
        notes.append("No recruiter opportunity records were supplied.")
    elif not opportunities:
        notes.append("No matching opportunities available based on current skills.")

    return RecommendationsResponse(
        alumni_mentors=mentors,
        alumni=mentors,
        recruiter_opportunities=opportunities,
        opportunities=opportunities,
        skills_to_develop=skills_to_develop,
        skills=skills_to_develop,
        notes=notes,
    )
