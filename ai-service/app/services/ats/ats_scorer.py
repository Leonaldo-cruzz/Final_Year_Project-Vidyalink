"""ATS Resume analysis scorer stub."""

from datetime import datetime, timezone
from typing import Any, Dict


def evaluate_resume_ats(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate a verified resume for ATS compatibility."""
    return {
        "atsScore": 0.0,
        "category": "pending",
        "breakdown": {
            "keywordMatching": {"score": 0, "weight": 30, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "formatting": {"score": 0, "weight": 20, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "technicalSkills": {"score": 0, "weight": 25, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "experience": {"score": 0, "weight": 15, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
            "education": {"score": 0, "weight": 10, "weightedScore": 0, "evidence": [], "explanation": "Not scored"},
        },
        "matchedSkills": [],
        "missingSkills": [],
        "missingKeywords": [],
        "detectedSections": [],
        "recommendations": [],
        "scoringVersion": "1.0",
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
    }
