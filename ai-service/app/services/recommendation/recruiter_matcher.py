"""Deterministic recruiter opportunity matching; it does not make hiring decisions."""

from __future__ import annotations

from .matching import coverage_score, display_term, missing, overlap
from .scoring import ALGORITHM_VERSION, RECRUITER_WEIGHTS, generated_at, priority_from_score, rank_recommendations, weighted_score


def _experience_score(student_years: float, required_years: float) -> float:
    if required_years <= 0:
        return 100.0
    return min(max(student_years, 0.0) / required_years, 1.0) * 100


def match_recruiter_opportunities(student: dict, opportunities: list[dict]) -> list[dict]:
    """Recommend relevant visible opportunities, never selecting a candidate."""
    recommendations = []
    timestamp = generated_at()

    for opportunity in opportunities:
        if not opportunity.get("verified") or not opportunity.get("active") or not opportunity.get("visible"):
            continue

        required_skills = opportunity.get("requiredSkills", [])
        preferred_skills = opportunity.get("preferredSkills", [])
        matched_required = overlap(student.get("skills"), required_skills)
        matched_preferred = overlap(student.get("skills"), preferred_skills)
        matched_domains = overlap(student.get("domains"), opportunity.get("domains", []))

        # Prevent broad, unsubstantiated opportunity suggestions.
        if not (matched_required or matched_preferred or matched_domains):
            continue

        features = {
            "required_skill_match": coverage_score(required_skills, student.get("skills")),
            "preferred_skill_match": coverage_score(preferred_skills, student.get("skills")),
            "domain_match": coverage_score(opportunity.get("domains", []), student.get("domains")),
            "portfolio_evidence": student.get("portfolioScore", 0.0),
            "verification_evidence": 100.0 if student.get("verificationEvidence", False) else 0.0,
            "experience_relevance": _experience_score(
                float(student.get("experienceYears", 0.0)),
                float(opportunity.get("minimumExperienceYears", 0.0)),
            ),
        }
        score = weighted_score(features, RECRUITER_WEIGHTS)
        missing_skills = missing(required_skills, student.get("skills"))
        reasons = []
        if matched_required:
            reasons.append(f"Matches required skills: {', '.join(display_term(skill) for skill in matched_required[:3])}")
        if matched_preferred:
            reasons.append(f"Matches preferred skills: {', '.join(display_term(skill) for skill in matched_preferred[:3])}")
        if matched_domains:
            reasons.append("Your project domain aligns with this opportunity")
        if student.get("portfolioScore", 0.0) >= 60:
            reasons.append("Your portfolio has supporting evidence for this opportunity")
        if student.get("verificationEvidence", False):
            reasons.append("Your verified project or certificate evidence strengthens this recommendation")

        recommendations.append({
            "entityId": str(opportunity["entityId"]),
            "type": "RECRUITER_OPPORTUNITY",
            "matchScore": score,
            "reasons": reasons,
            "matchedSkills": sorted(set(matched_required + matched_preferred)),
            "missingSkills": missing_skills,
            "priority": priority_from_score(score),
            "algorithmVersion": ALGORITHM_VERSION,
            "generatedAt": timestamp,
        })

    return rank_recommendations(recommendations)
