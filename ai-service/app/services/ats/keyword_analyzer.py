"""Keyword matching analyzer module for ATS evaluation."""

import re
from typing import Any, Dict, List, Optional, Set, Tuple


def _normalize_term(term: str) -> str:
    """Normalize a keyword term for uniform matching."""
    return re.sub(r"[^a-zA-Z0-9\+\#\.\s]", "", term.lower()).strip()


def analyze_keywords(
    normalized_text: str,
    target_job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Evaluate keyword matching against target job or standard technical resume terminology."""
    evidence: List[str] = []
    missing_keywords: List[str] = []

    if not normalized_text:
        return {
            "score": 0.0,
            "evidence": ["No resume text available for keyword analysis."],
            "explanation": "Cannot perform keyword analysis on empty resume content.",
            "missingKeywords": [],
            "requiredKeywordCoverage": 0.0,
            "preferredKeywordCoverage": 0.0,
            "overallKeywordCoverage": 0.0,
        }

    lower_text = normalized_text.lower()
    target_job = target_job or {}

    raw_required = target_job.get("requiredSkills") or []
    raw_preferred = target_job.get("preferredSkills") or []
    job_desc = str(target_job.get("description") or "")
    job_title = str(target_job.get("title") or "")

    has_target_job = bool(raw_required or raw_preferred or job_desc or job_title)

    if has_target_job:
        # Normalize and filter target keywords
        required_keywords = list({_normalize_term(k) for k in raw_required if _normalize_term(k)})
        preferred_keywords = list({_normalize_term(k) for k in raw_preferred if _normalize_term(k)})

        # If job title provided, add it as a role keyword
        if job_title:
            title_norm = _normalize_term(job_title)
            if title_norm and title_norm not in required_keywords and title_norm not in preferred_keywords:
                preferred_keywords.append(title_norm)

        # Match required keywords
        matched_required: List[str] = []
        for kw in required_keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower_text):
                matched_required.append(kw)
            else:
                missing_keywords.append(kw)

        # Match preferred keywords
        matched_preferred: List[str] = []
        for kw in preferred_keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower_text):
                matched_preferred.append(kw)

        req_total = len(required_keywords)
        pref_total = len(preferred_keywords)

        req_cov = (len(matched_required) / req_total) * 100.0 if req_total > 0 else 100.0
        pref_cov = (len(matched_preferred) / pref_total) * 100.0 if pref_total > 0 else 100.0

        if req_total > 0 and pref_total > 0:
            overall_cov = (req_cov * 0.70) + (pref_cov * 0.30)
        elif req_total > 0:
            overall_cov = req_cov
        elif pref_total > 0:
            overall_cov = pref_cov
        else:
            overall_cov = 80.0

        # Build evidence
        if req_total > 0:
            evidence.append(f"Matched {len(matched_required)}/{req_total} required job keywords ({req_cov:.1f}%).")
        if pref_total > 0:
            evidence.append(f"Matched {len(matched_preferred)}/{pref_total} preferred job keywords ({pref_cov:.1f}%).")
        if missing_keywords:
            evidence.append(f"Missing {len(missing_keywords)} target job keyword(s): {', '.join(missing_keywords[:5])}.")

        final_score = max(0.0, min(100.0, round(overall_cov, 2)))
        explanation = (
            f"Keyword matching scored at {final_score:.1f}/100 based on alignment with "
            f"target job description ({len(matched_required)} required, {len(matched_preferred)} preferred keywords matched)."
        )

        return {
            "score": final_score,
            "evidence": evidence,
            "explanation": explanation,
            "missingKeywords": missing_keywords,
            "requiredKeywordCoverage": round(req_cov, 2),
            "preferredKeywordCoverage": round(pref_cov, 2),
            "overallKeywordCoverage": round(overall_cov, 2),
        }

    else:
        # General scan (No target job specified)
        # Check standard technical, workflow, action-oriented, and domain keyword density
        standard_ats_keywords = [
            "development", "architecture", "software", "engineer", "framework",
            "database", "api", "rest", "git", "cloud", "agile", "testing",
            "optimization", "performance", "deployment", "scalable", "collaboration",
            "design", "backend", "frontend", "pipeline", "security", "data",
        ]

        matched_general = []
        for kw in standard_ats_keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", lower_text):
                matched_general.append(kw)

        # Baseline scoring based on keyword breadth without rewarding infinite repetition
        gen_count = len(matched_general)
        if gen_count >= 15:
            score = 90.0
            evidence.append(f"High industry keyword breadth ({gen_count} standard software engineering terms detected).")
        elif gen_count >= 10:
            score = 80.0
            evidence.append(f"Strong industry keyword breadth ({gen_count} standard software engineering terms detected).")
        elif gen_count >= 6:
            score = 70.0
            evidence.append(f"Moderate industry keyword density ({gen_count} terms detected).")
        elif gen_count >= 3:
            score = 55.0
            evidence.append(f"Basic keyword density ({gen_count} terms detected).")
        else:
            score = 35.0
            evidence.append("Sparse industry technical keywords detected.")

        explanation = (
            f"General ATS keyword scan evaluated at {score:.1f}/100 based on standard industry "
            f"software engineering terminology density (no specific target job provided)."
        )

        return {
            "score": score,
            "evidence": evidence,
            "explanation": explanation,
            "missingKeywords": [],
            "requiredKeywordCoverage": 100.0,
            "preferredKeywordCoverage": 100.0,
            "overallKeywordCoverage": round(score, 2),
        }
