"""Resume text parser — extracts normalized text from resume payload."""

from typing import Any, Dict


def parse_resume(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and normalize plain text from various resume payload shapes.

    Returns:
        dict with 'normalizedText' key containing cleaned text ready for skill extraction.
    """
    if not resume_data or not isinstance(resume_data, dict):
        return {"normalizedText": ""}

    raw_text = (
        resume_data.get("text")
        or resume_data.get("rawText")
        or resume_data.get("content")
        or ""
    )

    if not raw_text or not isinstance(raw_text, str):
        raw_text = ""

    normalized = raw_text.strip()
    return {"normalizedText": normalized}
