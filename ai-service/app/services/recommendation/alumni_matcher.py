"""Deterministic alumni mentor matching."""

from __future__ import annotations

from .matching import coverage_score, display_term, overlap
from .scoring import ALGORITHM_VERSION, ALUMNI_WEIGHTS, generated_at, priority_from_score, rank_recommendations, weighted_score


def _experience_score(years: float) -> float:
    """Five years is sufficient for the maximum mentoring-experience signal."""
    return min(max(years, 0.0) / 5.0, 1.0) * 100


def match_alumni(student: dict, candidates: list[dict]) -> list[dict]:
    """Return only eligible, relevant alumni with reasons for each score."""
    recommendations = []
    timestamp = generated_at()

    for candidate in candidates:
        if not candidate.get("verified") or not candidate.get("active") or not candidate.get("visible"):
            continue

        expertise = candidate.get("expertise", [])
        matched_skills = overlap(student.get("skills"), expertise)
        candidate_domains = candidate.get("domains", []) + candidate.get("industries", [])
        matched_domains = overlap(student.get("domains"), candidate_domains)
        matched_interests = overlap(student.get("interests"), candidate.get("interests", []))

        # A mentor needs an actual relevant signal, not merely a strong student portfolio.
        if not (matched_skills or matched_domains or matched_interests):
            continue

        features = {
            "skill_overlap": coverage_score(student.get("skills"), expertise),
            "domain_match": coverage_score(student.get("domains"), candidate_domains),
            "interest_match": coverage_score(student.get("interests"), candidate.get("interests", [])),
            "portfolio_evidence": student.get("portfolioScore", 0.0),
            "experience_relevance": _experience_score(float(candidate.get("experienceYears", 0.0))),
        }
        score = weighted_score(features, ALUMNI_WEIGHTS)
        reasons = []
        if matched_skills:
            reasons.append(f"Strong {', '.join(display_term(skill) for skill in matched_skills[:3])} skill overlap")
        if matched_domains:
            reasons.append("Alumni expertise matches your project domain")
        if matched_interests:
            reasons.append("Your stated interests align with this alumni mentor")
        if student.get("portfolioScore", 0.0) >= 60:
            reasons.append("Your portfolio evidence supports a focused mentor conversation")
        if candidate.get("experienceYears", 0.0) >= 3:
            reasons.append("Alumni professional experience is relevant for mentoring")

        recommendations.append({
            "entityId": str(candidate["entityId"]),
            "type": "ALUMNI_MENTOR",
            "matchScore": score,
            "reasons": reasons,
            "matchedSkills": matched_skills,
            "missingSkills": [],
            "priority": priority_from_score(score),
            "algorithmVersion": ALGORITHM_VERSION,
            "generatedAt": timestamp,
        })

    return rank_recommendations(recommendations)
