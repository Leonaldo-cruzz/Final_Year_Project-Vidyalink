"""Deterministic, text-only ATS analysis."""

from __future__ import annotations

import re

from src.models.ats import ATSRequest, ATSResponse
from src.services.skill_analysis import SKILL_ALIASES, _find_skills_in_text
from src.utils.scoring import category_for_score, rounded, weighted_average


STOP_WORDS = {
    "about", "after", "again", "also", "been", "being", "from", "have", "into", "more", "must",
    "only", "other", "over", "should", "that", "their", "there", "these", "this", "those", "with",
    "your", "will", "work", "years", "using", "looking", "role", "team", "good", "strong",
}


def _keyword_candidates(job_description: str) -> list[str]:
    if not job_description:
        return []
    controlled = _find_skills_in_text(job_description)
    words = re.findall(r"[A-Za-z][A-Za-z+#.-]{3,}", job_description.casefold())
    salient: list[str] = []
    seen_casefolded = {keyword.casefold() for keyword in controlled}
    for word in words:
        cleaned = word.strip(".-")
        if cleaned in STOP_WORDS or cleaned.casefold() in seen_casefolded:
            continue
        salient.append(cleaned)
        seen_casefolded.add(cleaned.casefold())
    # Controlled skills are returned canonically; salient terms remain input-derived.
    return list(dict.fromkeys(controlled + salient[:15]))


def _contains_heading(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(rf"(?im)^\s*(?:{pattern})\s*:?\s*$", text) for pattern in patterns)


def analyze_resume(request: ATSRequest) -> ATSResponse:
    resume = request.resume_text
    lower_resume = resume.casefold()
    job_keywords = _keyword_candidates(request.target_job_description or "")
    missing_keywords = [keyword for keyword in job_keywords if keyword.casefold() not in lower_resume]
    keyword_score = 100.0 if not job_keywords else (len(job_keywords) - len(missing_keywords)) / len(job_keywords) * 100

    detected_skills = _find_skills_in_text(resume)
    target_skills = _find_skills_in_text(request.target_job_description or "")
    skills_score = (
        100.0 if not target_skills and detected_skills else
        0.0 if not target_skills else len(set(detected_skills) & set(target_skills)) / len(set(target_skills)) * 100
    )

    sections = {
        "summary": _contains_heading(resume, ("summary", "profile", "objective")),
        "skills": _contains_heading(resume, ("skills", "technical skills", "technologies")),
        "education": _contains_heading(resume, ("education", "academic background")),
        "experience": _contains_heading(resume, ("experience", "work experience", "employment")),
        "projects": _contains_heading(resume, ("projects", "personal projects")),
        "certifications": _contains_heading(resume, ("certifications", "certificates")),
        "achievements": _contains_heading(resume, ("achievements", "awards")),
    }
    education_score = 100.0 if sections["education"] else (50.0 if re.search(r"\b(bachelor|master|degree|b\.tech|m\.tech|university|college)\b", lower_resume) else 0.0)
    experience_score = 100.0 if sections["experience"] else (50.0 if re.search(r"\b(intern|developer|engineer|experience|worked|employment)\b", lower_resume) else 0.0)
    completeness = sum(sections.values()) / len(sections) * 100

    lines = [line.strip() for line in resume.splitlines() if line.strip()]
    bullet_lines = sum(1 for line in lines if line.startswith(("-", "*", "•")))
    long_lines = sum(1 for line in lines if len(line) > 180)
    formatting_score = 100.0
    if lines and bullet_lines == 0:
        formatting_score -= 15
    if long_lines:
        formatting_score -= min(30, long_lines * 10)
    if len(resume) > 50000:
        formatting_score -= 20
    formatting_score = max(0.0, formatting_score)

    scores = {
        "keyword": keyword_score,
        "skills": skills_score,
        "education": education_score,
        "experience": experience_score,
        "formatting": formatting_score,
    }
    ats_score = weighted_average(
        scores,
        {"keyword": 0.30, "skills": 0.25, "education": 0.15, "experience": 0.20, "formatting": 0.10},
    )
    suggestions: list[str] = []
    if missing_keywords:
        suggestions.append("If accurate, reflect the missing job-description keywords in relevant resume evidence: " + ", ".join(missing_keywords[:8]) + ".")
    for section, present in sections.items():
        if not present:
            suggestions.append(f"Consider adding a clearly labelled {section} section if it is supported by your actual background.")
    if not detected_skills:
        suggestions.append("No controlled-vocabulary technical skills were detected; include only skills you can substantiate.")
    if bullet_lines == 0:
        suggestions.append("Use concise bullet-style lines for experience or project evidence when appropriate.")

    return ATSResponse(
        ats_score=rounded(ats_score),
        keyword_match_score=rounded(keyword_score),
        skills_score=rounded(skills_score),
        education_score=rounded(education_score),
        experience_score=rounded(experience_score),
        formatting_score=rounded(formatting_score),
        section_completeness=sections,
        missing_keywords=missing_keywords,
        detected_skills=detected_skills,
        suggestions=suggestions,
    )
