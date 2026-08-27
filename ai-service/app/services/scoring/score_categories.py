"""Score category classifications, constants, and weight definitions."""

from typing import Dict

SCORING_VERSION = "1.0"

# Exact weight distributions defined by Vidyalink specification
SCORING_WEIGHTS: Dict[str, float] = {
    "projectComplexity": 0.25,
    "technologyStack": 0.20,
    "githubActivity": 0.15,
    "documentationQuality": 0.15,
    "innovation": 0.15,
    "codeQuality": 0.10,
}


def get_score_category(score: float) -> str:
    """Map a numerical portfolio score (0-100) to its descriptive performance category.

    Categories:
    - 90.00 – 100.00 : Excellent
    - 80.00 – 89.99  : Very Good
    - 70.00 – 79.99  : Good
    - 60.00 – 69.99  : Average
    - Below 60.00    : Needs Improvement
    """
    if score >= 90.0:
        return "Excellent"
    if score >= 80.0:
        return "Very Good"
    if score >= 70.0:
        return "Good"
    if score >= 60.0:
        return "Average"
    return "Needs Improvement"
