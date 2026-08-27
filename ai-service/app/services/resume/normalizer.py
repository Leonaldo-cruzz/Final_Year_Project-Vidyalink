"""Resume text normalizer utility."""

import re
import unicodedata
from typing import Set


def normalize_text(text: str) -> str:
    """Normalize raw extracted resume text for robust parsing and analysis."""
    if not text:
        return ""

    normalized = unicodedata.normalize("NFKD", text)

    bullet_chars = ["•", "‣", "⁃", "◦", "▪", "▫", "–", "—", "―", "−", "*", ">"]
    for b in bullet_chars:
        normalized = normalized.replace(b, " - ")

    normalized = normalized.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    normalized = normalized.replace("\u00a0", " ").replace("\t", " ")
    normalized = re.sub(r"\r\n|\r", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)

    lines = [re.sub(r"[ ]{2,}", " ", line).strip() for line in normalized.split("\n")]
    return "\n".join(lines).strip()


def extract_normalized_words(text: str) -> Set[str]:
    """Extract unique lowercase alphanumeric word tokens from normalized text."""
    if not text:
        return set()
    cleaned = re.sub(r"[^a-zA-Z0-9\+\#\.\s\-\/]", " ", text.lower())
    tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
    return set(tokens)
