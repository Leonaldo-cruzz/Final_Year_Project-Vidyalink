"""Skill string normalizer resolving aliases to canonical taxonomy entries."""

import re
from typing import Any, Dict, List, Optional
from app.services.skills.taxonomy import SKILL_ALIASES, SKILL_TAXONOMY


def clean_skill_string(raw: str) -> str:
    """Strip extraneous punctuation and whitespace from a raw skill token."""
    if not raw or not isinstance(raw, str):
        return ""
    cleaned = raw.strip().lower()
    # Normalize multiple spaces
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def normalize_skill(raw_skill: str) -> Optional[Dict[str, str]]:
    """Normalize a raw skill string to its canonical taxonomy representation.

    Returns dict with { name, canonicalName, category } or None if unrecognized.
    """
    cleaned = clean_skill_string(raw_skill)
    if not cleaned:
        return None

    # 1. Direct match in aliases dictionary
    canonical_key = SKILL_ALIASES.get(cleaned)

    # 2. Try direct match in taxonomy keys
    if not canonical_key and cleaned in SKILL_TAXONOMY:
        canonical_key = cleaned

    # 3. Strip minor trailing punctuation (e.g., "react," -> "react")
    if not canonical_key:
        stripped = re.sub(r"[,\.;:\(\)\[\]]", "", cleaned).strip()
        canonical_key = SKILL_ALIASES.get(stripped) or (stripped if stripped in SKILL_TAXONOMY else None)

    if canonical_key and canonical_key in SKILL_TAXONOMY:
        meta = SKILL_TAXONOMY[canonical_key]
        return {
            "name": meta["name"],
            "canonicalName": canonical_key,
            "category": meta["category"],
        }

    # If completely unrecognized, provide safe fallback canonicalization
    # Only for valid non-empty tokens (> 1 char)
    if len(cleaned) >= 2 and not re.search(r"[^\w\+\#\.\s\-]", cleaned):
        clean_name = raw_skill.strip().title()
        safe_canonical = re.sub(r"[^\w\+\#\.\-]", "_", cleaned)
        return {
            "name": clean_name,
            "canonicalName": safe_canonical,
            "category": "other",
        }

    return None


def normalize_skill_list(raw_skills: List[Any]) -> List[Dict[str, str]]:
    """Normalize a list of raw skills (strings or dicts) into deduplicated canonical entries."""
    if not raw_skills:
        return []

    normalized_list = []
    seen = set()

    for item in raw_skills:
        raw_str = ""
        if isinstance(item, str):
            raw_str = item
        elif isinstance(item, dict):
            raw_str = item.get("name") or item.get("canonicalName") or item.get("title") or ""

        norm = normalize_skill(raw_str)
        if norm and norm["canonicalName"] not in seen:
            seen.add(norm["canonicalName"])
            normalized_list.append(norm)

    return normalized_list
