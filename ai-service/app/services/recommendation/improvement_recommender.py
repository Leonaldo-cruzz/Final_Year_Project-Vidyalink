"""Evidence-based student improvement recommendations."""

from __future__ import annotations

from .matching import display_term, normalize_terms
from .scoring import ALGORITHM_VERSION, generated_at, priority_from_score, rank_recommendations


def _recommendation(entity_id: str, recommendation_type: str, score: float, reason: str, *, missing_skills=None, timestamp: str) -> dict:
    return {
        "entityId": entity_id,
        "type": recommendation_type,
        "matchScore": score,
        "reasons": [reason],
        "matchedSkills": [],
        "missingSkills": missing_skills or [],
        "priority": priority_from_score(score),
        "algorithmVersion": ALGORITHM_VERSION,
        "generatedAt": timestamp,
    }


def recommend_improvements(student: dict) -> list[dict]:
    """Emit an action only when a supplied backend evidence signal supports it."""
    recommendations = []
    timestamp = generated_at()
    evidence = student.get("evidence", {})

    for skill in normalize_terms(student.get("skillGaps")):
        recommendations.append(_recommendation(
            f"skill:{skill}",
            "SKILL_IMPROVEMENT",
            90.0,
            f"{display_term(skill)} is required by relevant visible opportunities and is not in your verified skill profile",
            missing_skills=[skill],
            timestamp=timestamp,
        ))

    for skill in normalize_terms(evidence.get("weakEvidenceSkills")):
        recommendations.append(_recommendation(
            f"skill:evidence:{skill}",
            "SKILL_IMPROVEMENT",
            68.0,
            f"Your {display_term(skill)} skill is listed but does not yet have verified project, certificate, or portfolio evidence",
            timestamp=timestamp,
        ))

    project_count = int(evidence.get("projectCount", 0))
    if project_count == 0:
        recommendations.append(_recommendation(
            "project:portfolio-foundation",
            "PROJECT_IMPROVEMENT",
            90.0,
            "No project evidence is available in your portfolio yet",
            timestamp=timestamp,
        ))
    else:
        undocumented = int(evidence.get("undocumentedProjectCount", 0))
        if undocumented:
            recommendations.append(_recommendation(
                "project:documentation",
                "PROJECT_IMPROVEMENT",
                78.0,
                f"{undocumented} project(s) lack documentation or a README link",
                timestamp=timestamp,
            ))
        evidence_missing = int(evidence.get("projectEvidenceMissingCount", 0))
        if evidence_missing:
            recommendations.append(_recommendation(
                "project:evidence",
                "PROJECT_IMPROVEMENT",
                72.0,
                f"{evidence_missing} project(s) are missing a repository, deployment, or screenshots",
                timestamp=timestamp,
            ))

    if not evidence.get("hasResume", False):
        recommendations.append(_recommendation(
            "resume:missing",
            "RESUME_IMPROVEMENT",
            85.0,
            "No uploaded resume is available for ATS analysis or opportunity applications",
            timestamp=timestamp,
        ))
    elif student.get("atsScore") is not None and float(student["atsScore"]) < 60:
        recommendations.append(_recommendation(
            "resume:ats-keywords",
            "RESUME_IMPROVEMENT",
            82.0,
            "Your stored ATS analysis is below 60, indicating resume keyword coverage can improve",
            timestamp=timestamp,
        ))

    if not evidence.get("githubConnected", False):
        recommendations.append(_recommendation(
            "project:github-activity",
            "PROJECT_IMPROVEMENT",
            70.0,
            "No connected GitHub account is available as portfolio activity evidence",
            timestamp=timestamp,
        ))
    elif int(evidence.get("githubPublicRepos", 0)) < 3:
        recommendations.append(_recommendation(
            "project:github-repositories",
            "PROJECT_IMPROVEMENT",
            65.0,
            "Your connected GitHub account has low public repository activity; add or maintain project repositories",
            timestamp=timestamp,
        ))

    if int(evidence.get("verifiedCertificateCount", 0)) == 0:
        recommendations.append(_recommendation(
            "skill:verified-certificate-evidence",
            "SKILL_IMPROVEMENT",
            55.0,
            "No verified certificate evidence is available for your listed skills",
            timestamp=timestamp,
        ))

    if evidence.get("profileCompletion") is not None and float(evidence["profileCompletion"]) < 80:
        recommendations.append(_recommendation(
            "resume:profile-completeness",
            "RESUME_IMPROVEMENT",
            60.0,
            f"Your backend profile is {int(evidence['profileCompletion'])}% complete; add the missing profile details used in applications",
            timestamp=timestamp,
        ))

    return rank_recommendations(recommendations)
