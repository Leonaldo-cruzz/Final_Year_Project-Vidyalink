"""Formatting and ATS-parseability analyzer module."""

import re
from typing import Any, Dict, List


def analyze_formatting(
    raw_text: str,
    normalized_text: str,
    detected_sections: List[str],
    sections_map: Dict[str, str],
) -> Dict[str, Any]:
    """Evaluate structural ATS-friendliness, parseability, section hygiene, and contact info."""
    evidence: List[str] = []

    if not normalized_text:
        return {
            "score": 0.0,
            "evidence": ["Empty document content; no parseable text extracted."],
            "explanation": "Document contains no readable text for ATS parsing.",
        }

    points = 0.0
    word_count = len(normalized_text.split())

    if 250 <= word_count <= 1000:
        points += 25.0
        evidence.append(f"Optimal ATS text length ({word_count} words extracted cleanly).")
    elif 150 <= word_count <= 1500:
        points += 18.0
        evidence.append(f"Acceptable document length ({word_count} words).")
    elif word_count > 50:
        points += 10.0
        evidence.append(f"Short document length ({word_count} words).")
    else:
        evidence.append("Very low word count extracted (< 50 words).")

    section_count = len(detected_sections)
    if section_count >= 5:
        points += 30.0
        evidence.append(f"Strong structural clarity ({section_count} standard ATS section headers detected: {', '.join(detected_sections[:4])}...).")
    elif section_count >= 3:
        points += 20.0
        evidence.append(f"Good structural layout ({section_count} standard section headers detected).")
    elif section_count >= 1:
        points += 10.0
        evidence.append(f"Minimal section headers detected ({section_count} header).")
    else:
        evidence.append("No recognized standard ATS section headers found.")

    has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", normalized_text))
    has_phone = bool(re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", normalized_text))
    has_profile_links = bool(re.search(r"(?:linkedin\.com|github\.com|portfolio|\.dev|\.io)", normalized_text, re.IGNORECASE))

    contact_pts = 0.0
    if has_email:
        contact_pts += 10.0
    if has_phone:
        contact_pts += 10.0
    if has_profile_links:
        contact_pts += 5.0

    points += contact_pts
    if has_email and has_phone:
        evidence.append("Complete contact details present (Email and Phone number verified).")
    elif has_email or has_phone:
        evidence.append("Partial contact details present (Missing phone or email).")
    else:
        evidence.append("No standard contact email or phone number detected.")

    weird_chars = len(re.findall(r"[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]", raw_text))
    symbol_ratio = len(re.findall(r"[\^~|#$@%&*=_\\]", normalized_text)) / max(1, word_count)

    if weird_chars == 0 and symbol_ratio < 0.25:
        points += 20.0
        evidence.append("Clean character encoding without corrupted text artifacts.")
    elif weird_chars < 5:
        points += 12.0
        evidence.append("Minor character encoding artifacts detected.")
    else:
        evidence.append("Warning: Unrecognized or corrupted characters detected in extracted text.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Formatting scored at {final_score:.1f}/100 based on text extractability, "
        f"standard section layout, verified contact info, and clean character encoding."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
