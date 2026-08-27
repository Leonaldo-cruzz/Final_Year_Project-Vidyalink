"""Main ATS Resume Evaluation Engine aggregator."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.ats.config import (
    ATS_SCORING_VERSION,
    ATS_SCORING_WEIGHTS,
    get_ats_score_category,
)
from app.services.resume.parser import parse_resume
from app.services.ats.section_detector import detect_resume_sections
from app.services.ats.keyword_analyzer import analyze_keywords
from app.services.ats.skills_analyzer import analyze_technical_skills
from app.services.ats.experience_analyzer import analyze_experience
from app.services.ats.education_analyzer import analyze_education
from app.services.ats.formatting_analyzer import analyze_formatting


def generate_ats_recommendations(
    breakdown: Dict[str, Any],
    missing_skills: List[str],
    missing_keywords: List[str],
    detected_sections: List[str],
) -> List[str]:
    """Generate prioritized, actionable recommendations to improve ATS compatibility."""
    recommendations: List[str] = []

    if missing_keywords:
        top_missing_kw = missing_keywords[:4]
        recommendations.append(f"Incorporate missing target job keywords: {', '.join(top_missing_kw)}.")

    if missing_skills:
        top_missing_sk = missing_skills[:4]
        recommendations.append(f"Highlight core required skills in your Skills section: {', '.join(top_missing_sk)}.")

    essential_sections = ["Summary", "Skills", "Experience", "Projects", "Education"]
    for sec in essential_sections:
        if sec not in detected_sections:
            recommendations.append(f"Add a dedicated '{sec}' section with standard ATS heading.")

    fmt_score = breakdown.get("formatting", {}).get("score", 100.0)
    if fmt_score < 70.0:
        recommendations.append("Ensure complete contact information (Email, Phone, LinkedIn/GitHub) is positioned clearly at the top.")

    exp_score = breakdown.get("experience", {}).get("score", 100.0)
    if exp_score < 70.0:
        recommendations.append("Include quantifiable achievements (e.g., percentages, scale, throughput) in your project and experience bullet points.")

    tech_score = breakdown.get("technicalSkills", {}).get("score", 100.0)
    if tech_score < 70.0:
        recommendations.append("Categorize technical proficiencies into distinct groups (Languages, Frameworks, Databases, Cloud & Tools).")

    if not recommendations:
        recommendations.append("Resume exhibits strong ATS alignment across structure, skills, and terminology.")

    return recommendations[:6]


def evaluate_resume_ats(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute complete deterministic ATS evaluation of a verified resume."""
    resume_data: Dict[str, Any] = payload.get("resume") or {}
    target_job: Optional[Dict[str, Any]] = payload.get("targetJob")

    parsed = parse_resume(resume_data)
    raw_text = parsed["rawText"]
    normalized_text = parsed["normalizedText"]

    sections_res = detect_resume_sections(normalized_text)
    detected_sections = sections_res["detectedSections"]
    sections_map = sections_res["sectionsMap"]

    kw_res = analyze_keywords(normalized_text, target_job)
    skills_res = analyze_technical_skills(normalized_text, target_job)
    fmt_res = analyze_formatting(raw_text, normalized_text, detected_sections, sections_map)
    exp_res = analyze_experience(normalized_text, sections_map)
    edu_res = analyze_education(normalized_text, sections_map)

    w_kw = ATS_SCORING_WEIGHTS["keywordMatching"]    # 0.30
    w_skills = ATS_SCORING_WEIGHTS["technicalSkills"] # 0.25
    w_fmt = ATS_SCORING_WEIGHTS["formatting"]        # 0.20
    w_exp = ATS_SCORING_WEIGHTS["experience"]        # 0.15
    w_edu = ATS_SCORING_WEIGHTS["education"]         # 0.10

    weighted_kw = round(kw_res["score"] * w_kw, 2)
    weighted_skills = round(skills_res["score"] * w_skills, 2)
    weighted_fmt = round(fmt_res["score"] * w_fmt, 2)
    weighted_exp = round(exp_res["score"] * w_exp, 2)
    weighted_edu = round(edu_res["score"] * w_edu, 2)

    raw_total = (
        (kw_res["score"] * w_kw)
        + (skills_res["score"] * w_skills)
        + (fmt_res["score"] * w_fmt)
        + (exp_res["score"] * w_exp)
        + (edu_res["score"] * w_edu)
    )

    final_score = max(0.0, min(100.0, round(raw_total, 2)))
    category = get_ats_score_category(final_score)
    evaluated_at = datetime.now(timezone.utc).isoformat()

    breakdown = {
        "keywordMatching": {
            "score": kw_res["score"],
            "weight": int(w_kw * 100),
            "weightedScore": weighted_kw,
            "evidence": kw_res["evidence"],
            "explanation": kw_res["explanation"],
        },
        "formatting": {
            "score": fmt_res["score"],
            "weight": int(w_fmt * 100),
            "weightedScore": weighted_fmt,
            "evidence": fmt_res["evidence"],
            "explanation": fmt_res["explanation"],
        },
        "technicalSkills": {
            "score": skills_res["score"],
            "weight": int(w_skills * 100),
            "weightedScore": weighted_skills,
            "evidence": skills_res["evidence"],
            "explanation": skills_res["explanation"],
        },
        "experience": {
            "score": exp_res["score"],
            "weight": int(w_exp * 100),
            "weightedScore": weighted_exp,
            "evidence": exp_res["evidence"],
            "explanation": exp_res["explanation"],
        },
        "education": {
            "score": edu_res["score"],
            "weight": int(w_edu * 100),
            "weightedScore": weighted_edu,
            "evidence": edu_res["evidence"],
            "explanation": edu_res["explanation"],
        },
    }

    missing_keywords = kw_res.get("missingKeywords") or []
    missing_skills = skills_res.get("missingSkills") or []
    matched_skills = skills_res.get("matchedSkills") or []

    recommendations = generate_ats_recommendations(
        breakdown=breakdown,
        missing_skills=missing_skills,
        missing_keywords=missing_keywords,
        detected_sections=detected_sections,
    )

    return {
        "atsScore": final_score,
        "category": category,
        "breakdown": breakdown,
        "matchedSkills": matched_skills,
        "missingSkills": missing_skills,
        "missingKeywords": missing_keywords,
        "detectedSections": detected_sections,
        "recommendations": recommendations,
        "scoringVersion": ATS_SCORING_VERSION,
        "evaluatedAt": evaluated_at,
    }
