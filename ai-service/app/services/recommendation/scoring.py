"""Centralized weights and score/ranking helpers for recommendation matching."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timezone


ALGORITHM_VERSION = "1.0"


def generated_at() -> str:
    """Return an ISO-8601 UTC timestamp for recommendation traceability."""
    return datetime.now(timezone.utc).isoformat()

# Keep all matching weights here.  Each group totals 1.0.
ALUMNI_WEIGHTS = {
    "skill_overlap": 0.40,
    "domain_match": 0.20,
    "interest_match": 0.15,
    "portfolio_evidence": 0.15,
    "experience_relevance": 0.10,
}

RECRUITER_WEIGHTS = {
    "required_skill_match": 0.40,
    "preferred_skill_match": 0.15,
    "domain_match": 0.15,
    "portfolio_evidence": 0.15,
    "verification_evidence": 0.10,
    "experience_relevance": 0.05,
}


def weighted_score(features: Mapping[str, float], weights: Mapping[str, float]) -> float:
    """Calculate and clamp an explainable 0-100 weighted score."""
    score = sum(max(0.0, min(100.0, features.get(name, 0.0))) * weight for name, weight in weights.items())
    return round(max(0.0, min(100.0, score)), 2)


def priority_from_score(score: float) -> str:
    if score >= 80:
        return "HIGH"
    if score >= 50:
        return "MEDIUM"
    return "LOW"


def rank_recommendations(recommendations: list[dict]) -> list[dict]:
    """Use entity id as a stable tie-breaker so equal inputs always rank alike."""
    return sorted(
        recommendations,
        key=lambda recommendation: (-recommendation["matchScore"], recommendation["entityId"]),
    )
