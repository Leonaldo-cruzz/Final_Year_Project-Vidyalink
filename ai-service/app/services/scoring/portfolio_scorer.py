"""Portfolio scoring engine stub."""

from datetime import datetime, timezone
from typing import Any, Dict


def evaluate_portfolio_score(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate a verified portfolio and return a score breakdown."""
    return {
        "portfolioScore": 0.0,
        "category": "pending",
        "breakdown": {
            "projectComplexity": {"score": 0, "weight": 25, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "technologyStack": {"score": 0, "weight": 20, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "githubActivity": {"score": 0, "weight": 15, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "documentationQuality": {"score": 0, "weight": 15, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "innovation": {"score": 0, "weight": 15, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "codeQuality": {"score": 0, "weight": 10, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
        },
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
    }
