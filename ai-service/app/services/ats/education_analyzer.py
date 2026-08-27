"""Education analyzer module for ATS evaluation."""

import re
from typing import Any, Dict, List

DEGREE_PATTERNS = [
    r"\b(?:b\.?tech|b\.?e|b\.?s|bachelor(?:'?s)?|bca|m\.?tech|m\.?s|m\.?e|master(?:'?s)?|mca|ph\.?d|diploma)\b",
    r"\bbachelor\s+of\s+(?:technology|engineering|science|computer\s+applications)\b",
    r"\bmaster\s+of\s+(?:technology|engineering|science|computer\s+applications)\b",
]

INSTITUTION_KEYWORDS = [
    "university", "institute", "college", "school of", "academy", "polytechnic",
    "iit", "nit", "iiit", "bits", "campus",
]

BRANCH_KEYWORDS = [
    "computer science", "information technology", "software engineering",
    "data science", "artificial intelligence", "electrical", "electronics",
    "mechanical", "civil", "computational", "mathematics",
]


def analyze_education(
    normalized_text: str,
    sections_map: Dict[str, str],
) -> Dict[str, Any]:
    """Evaluate degree detection, institution presence, graduation year, and field of study."""
    evidence: List[str] = []

    if not normalized_text:
        return {
            "score": 0.0,
            "evidence": ["No resume text provided to assess education."],
            "explanation": "Cannot analyze education on empty resume content.",
        }

    points = 0.0
    lower_text = normalized_text.lower()
    edu_text = sections_map.get("Education", "").lower()
    search_target = edu_text if edu_text.strip() else lower_text

    # 1. Dedicated Education section (up to 25 pts)
    if "Education" in sections_map:
        points += 25.0
        evidence.append("Dedicated Education section header verified.")
    else:
        evidence.append("No explicit Education section header detected.")

    # 2. Degree qualification (up to 30 pts)
    has_degree = False
    for deg_pat in DEGREE_PATTERNS:
        match = re.search(deg_pat, search_target, re.IGNORECASE)
        if match:
            has_degree = True
            points += 30.0
            evidence.append(f"Recognized degree qualification detected: '{match.group(0).strip()}'.")
            break

    if not has_degree:
        evidence.append("No standard collegiate degree qualification recognized.")

    # 3. Educational Institution / University (up to 20 pts)
    has_institution = any(inst in search_target for inst in INSTITUTION_KEYWORDS)
    if has_institution:
        points += 20.0
        evidence.append("Academic institution / university name identified.")
    else:
        evidence.append("No recognized university or collegiate institution keyword found.")

    # 4. Field of study / Branch (up to 15 pts)
    has_branch = False
    for br in BRANCH_KEYWORDS:
        if br in search_target:
            has_branch = True
            points += 15.0
            evidence.append(f"Field of study / major recognized: '{br}'.")
            break

    if not has_branch:
        evidence.append("No specific major/branch specialization keyword recognized.")

    # 5. Graduation Year or Academic Timeline (up to 10 pts)
    grad_year_match = re.search(r"\b(?:19|20)\d{2}\b", search_target)
    if grad_year_match:
        points += 10.0
        evidence.append(f"Graduation or academic year marker confirmed ({grad_year_match.group(0)}).")
    else:
        evidence.append("No academic graduation year detected.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Education evaluated at {final_score:.1f}/100 based on section structure, "
        f"degree classification, institution name, major specialization, and graduation timeline."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
