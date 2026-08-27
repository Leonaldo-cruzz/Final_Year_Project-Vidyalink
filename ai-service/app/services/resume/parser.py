"""Resume parser orchestration module."""

from typing import Any, Dict
from app.services.resume.text_extractor import extract_resume_text
from app.services.resume.normalizer import normalize_text, extract_normalized_words


def parse_resume(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and normalize text from a resume payload."""
    raw_text = extract_resume_text(resume_data)
    normalized = normalize_text(raw_text)
    words = extract_normalized_words(normalized)

    return {
        "rawText": raw_text,
        "normalizedText": normalized,
        "charCount": len(normalized),
        "wordCount": len(normalized.split()) if normalized else 0,
        "vocabularySize": len(words),
        "hasContent": bool(normalized.strip()),
    }
