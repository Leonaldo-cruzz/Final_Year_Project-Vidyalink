"""Experience analyzer module for ATS evaluation."""

import re
from typing import Any, Dict, List

ACTION_VERBS = [
    "developed", "implemented", "engineered", "designed", "architected",
    "built", "optimized", "integrated", "managed", "led", "spearheaded",
    "deployed", "refactored", "automated", "created", "collaborated",
    "scaled", "enhanced", "resolved", "maintained", "configured",
]

ROLE_PATTERNS = [
    r"\b(?:software|full[\s-]stack|frontend|backend|web|mobile|devops|data|ai|cloud|systems?|qa)\s+(?:engineer|developer|intern|lead|consultant)\b",
    r"\b(?:intern|trainee|apprentice|fellow|associate)\b",
    r"\b(?:product|project)\s+manager\b",
]

DATE_PATTERNS = [
    r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b",
    r"\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b",
    r"\b(?:spring|summer|fall|winter)\s+\d{4}\b",
]


def analyze_experience(
    normalized_text: str,
    sections_map: Dict[str, str],
) -> Dict[str, Any]:
    """Evaluate experience presence, role definitions, timeline/dates, action verbs, and quantifiable metrics."""
    evidence: List[str] = []

    if not normalized_text:
        return {
            "score": 0.0,
            "evidence": ["No resume text available to assess experience."],
            "explanation": "Cannot analyze experience on empty resume content.",
        }

    points = 0.0
    lower_text = normalized_text.lower()

    # 1. Experience / Project section presence (up to 25 pts)
    has_exp_section = "Experience" in sections_map
    has_proj_section = "Projects" in sections_map

    if has_exp_section and has_proj_section:
        points += 25.0
        evidence.append("Dedicated Professional Experience and Technical Projects sections verified.")
    elif has_exp_section:
        points += 20.0
        evidence.append("Dedicated Professional Experience section verified.")
    elif has_proj_section:
        points += 15.0
        evidence.append("Technical Projects section detected (academic / project portfolio).")
    else:
        evidence.append("No explicit Experience or Projects section header detected.")

    exp_and_proj_text = (sections_map.get("Experience", "") + "\n" + sections_map.get("Projects", "")).lower()
    search_target = exp_and_proj_text if exp_and_proj_text.strip() else lower_text

    # 2. Role Title & Position Signals (up to 20 pts)
    detected_roles = []
    for r_pat in ROLE_PATTERNS:
        matches = re.findall(r_pat, search_target, re.IGNORECASE)
        detected_roles.extend(matches)

    if len(detected_roles) >= 2:
        points += 20.0
        evidence.append(f"Clear professional role designations identified ({len(detected_roles)} positions/roles detected).")
    elif len(detected_roles) == 1:
        points += 12.0
        evidence.append(f"Professional role title identified: '{detected_roles[0]}'.")
    else:
        evidence.append("No standard professional role titles recognized.")

    # 3. Employment / Project Timeline & Dates (up to 20 pts)
    detected_dates = []
    for d_pat in DATE_PATTERNS:
        matches = re.findall(d_pat, search_target, re.IGNORECASE)
        detected_dates.extend(matches)

    if len(detected_dates) >= 2:
        points += 20.0
        evidence.append(f"Clear chronological date ranges verified ({len(detected_dates)} timeframe entries).")
    elif len(detected_dates) == 1:
        points += 10.0
        evidence.append("Single date/timeline marker detected.")
    else:
        evidence.append("No explicit chronological timeline or employment dates found.")

    # 4. Action-Oriented Verbs (up to 20 pts)
    matched_action_verbs = [verb for verb in ACTION_VERBS if re.search(r"\b" + verb + r"\b", search_target)]
    if len(matched_action_verbs) >= 6:
        points += 20.0
        evidence.append(f"Strong action-verb phrasing ({len(matched_action_verbs)} action verbs: {', '.join(matched_action_verbs[:4])}...).")
    elif len(matched_action_verbs) >= 3:
        points += 12.0
        evidence.append(f"Action-oriented phrasing used ({len(matched_action_verbs)} action verbs).")
    elif len(matched_action_verbs) >= 1:
        points += 6.0
        evidence.append(f"Basic action verbs present ({matched_action_verbs[0]}).")

    # 5. Quantifiable Achievements & Impact Metrics (up to 15 pts)
    # Regex matching percentages, metrics (e.g. 50%, 10k, 2x, 100+ users, 400ms)
    metric_matches = re.findall(r"\b(?:\d+%(?:\.\d+)?|\d+k\+?|\d+x|\d+\+?\s+(?:users|requests|ms|seconds|minutes|stars|downloads|clients))\b", search_target, re.IGNORECASE)
    if len(metric_matches) >= 3:
        points += 15.0
        evidence.append(f"Multiple quantifiable metric indicators verified ({', '.join(metric_matches[:3])}).")
    elif len(metric_matches) >= 1:
        points += 8.0
        evidence.append(f"Quantifiable impact metric detected: '{metric_matches[0]}'.")
    else:
        evidence.append("No measurable metrics or quantifiable impact percentages detected.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Experience evaluated at {final_score:.1f}/100 based on section clarity, "
        f"role titles, chronological timelines, action verbs, and quantifiable achievement metrics."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
