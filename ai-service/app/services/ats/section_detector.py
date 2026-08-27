"""Resume section detector module."""

import re
from typing import Any, Dict, List, Tuple

# Section heading patterns tolerant of common variations and casing
SECTION_PATTERNS: Dict[str, List[str]] = {
    "Summary": [
        r"^(?:professional\s+)?summary",
        r"^(?:professional\s+)?profile",
        r"^about\s+me",
        r"^executive\s+summary",
    ],
    "Objective": [
        r"^(?:career\s+)?objective",
    ],
    "Skills": [
        r"^(?:technical\s+)?skills",
        r"^core\s+competencies",
        r"^technologies(?:\s+and\s+tools)?",
        r"^technical\s+proficiencies",
        r"^programming\s+languages",
        r"^skills\s+and\s+tools",
    ],
    "Experience": [
        r"^(?:work|professional|employment)\s+experience",
        r"^experience",
        r"^internships?(?:\s+and\s+experience)?",
        r"^employment\s+history",
        r"^work\s+history",
    ],
    "Education": [
        r"^education(?:al\s+background)?",
        r"^academic\s+(?:qualifications|history|background)",
        r"^qualifications",
    ],
    "Projects": [
        r"^(?:technical|academic|personal|key)?\s*projects",
        r"^project\s+experience",
    ],
    "Certifications": [
        r"^certifications?(?:\s+and\s+licenses)?",
        r"^licenses\s+and\s+certifications",
        r"^courses\s+and\s+certifications",
    ],
    "Achievements": [
        r"^(?:honors|awards|achievements)(?:\s+and\s+awards)?",
        r"^key\s+accomplishments",
    ],
    "Contact": [
        r"^contact(?:\s+information)?",
        r"^personal\s+details",
    ],
}


def detect_resume_sections(normalized_text: str) -> Dict[str, Any]:
    """Detect presence and line positions of standard resume sections."""
    if not normalized_text:
        return {"detectedSections": [], "sectionsMap": {}}

    lines = [line.strip() for line in normalized_text.split("\n") if line.strip()]
    detected_headers: List[Tuple[str, int]] = []
    seen_sections = set()

    for idx, line in enumerate(lines):
        # Header candidate: short line (< 50 chars) without ending punctuation
        cleaned_line = re.sub(r"[:\-_#\*]", " ", line).strip().lower()
        if len(cleaned_line) < 45 and not cleaned_line.endswith("."):
            for section_name, patterns in SECTION_PATTERNS.items():
                if section_name not in seen_sections:
                    for pat in patterns:
                        if re.match(pat, cleaned_line, re.IGNORECASE):
                            detected_headers.append((section_name, idx))
                            seen_sections.add(section_name)
                            break

    # Also check contact information presence through patterns (email, phone, github/linkedin)
    if "Contact" not in seen_sections:
        has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", normalized_text))
        has_phone = bool(re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", normalized_text))
        if has_email or has_phone:
            seen_sections.add("Contact")

    # Extract text content between section headers
    sections_map: Dict[str, str] = {}
    sorted_headers = sorted(detected_headers, key=lambda x: x[1])

    for i, (sec_name, start_idx) in enumerate(sorted_headers):
        end_idx = sorted_headers[i + 1][1] if i + 1 < len(sorted_headers) else len(lines)
        section_content = "\n".join(lines[start_idx + 1:end_idx]).strip()
        sections_map[sec_name] = section_content

    # Order of detected sections
    standard_order = ["Contact", "Summary", "Objective", "Skills", "Experience", "Projects", "Education", "Certifications", "Achievements"]
    ordered_detected = [s for s in standard_order if s in seen_sections]

    return {
        "detectedSections": ordered_detected,
        "sectionsMap": sections_map,
    }
