"""Central configuration for ATS Resume Analysis weights, versions, and category mappings."""

from typing import Dict

ATS_SCORING_VERSION = "1.0"

# Exact weight allocations specified by Vidyalink ATS specification
ATS_SCORING_WEIGHTS: Dict[str, float] = {
    "keywordMatching": 0.30,
    "technicalSkills": 0.25,
    "formatting": 0.20,
    "experience": 0.15,
    "education": 0.10,
}


def get_ats_score_category(score: float) -> str:
    """Map numerical ATS score (0-100) to its descriptive performance category."""
    if score >= 90.0:
        return "Excellent"
    if score >= 80.0:
        return "Very Good"
    if score >= 70.0:
        return "Good"
    if score >= 60.0:
        return "Average"
    return "Needs Improvement"
