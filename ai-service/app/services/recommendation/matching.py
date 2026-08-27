"""Shared, lightweight matching helpers.

The engine intentionally uses normalized exact-token overlap instead of an
embedding model.  That makes every result repeatable and easy to audit.
"""

from __future__ import annotations

import re
from collections.abc import Iterable


SKILL_ALIASES = {
    "reactjs": "react",
    "react js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "node js": "node.js",
    "expressjs": "express",
    "express js": "express",
    "mongodb": "mongodb",
    "mongo db": "mongodb",
    "postgres": "postgresql",
    "postgre sql": "postgresql",
    "amazon web services": "aws",
    "aws cloud": "aws",
    "google cloud platform": "gcp",
    "machine learning": "ml",
    "artificial intelligence": "ai",
}

DISPLAY_NAMES = {
    "react": "React",
    "node.js": "Node.js",
    "express": "Express",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "aws": "AWS",
    "gcp": "GCP",
    "ai": "AI",
    "ml": "ML",
    "github": "GitHub",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
}


def normalize_term(value: str | None) -> str:
    """Normalize a skill/domain while preserving an auditable alias table."""
    if not value:
        return ""
    normalized = re.sub(r"[._/\\-]+", " ", str(value).strip().lower())
    normalized = re.sub(r"\s+", " ", normalized)
    return SKILL_ALIASES.get(normalized, normalized)


def normalize_terms(values: Iterable[str] | None) -> list[str]:
    """Return unique normalized terms in deterministic order."""
    normalized = {normalize_term(value) for value in (values or [])}
    return sorted(term for term in normalized if term)


def display_term(value: str) -> str:
    """Render a normalized term for a human-facing reason."""
    return DISPLAY_NAMES.get(value, value)


def overlap(left: Iterable[str] | None, right: Iterable[str] | None) -> list[str]:
    """Return the normalized intersection in deterministic order."""
    return sorted(set(normalize_terms(left)).intersection(normalize_terms(right)))


def missing(required: Iterable[str] | None, available: Iterable[str] | None) -> list[str]:
    """Return required normalized terms not present in available terms."""
    return sorted(set(normalize_terms(required)).difference(normalize_terms(available)))


def coverage_score(required: Iterable[str] | None, available: Iterable[str] | None) -> float:
    """Score the portion of ``required`` covered by ``available`` on 0-100."""
    required_terms = normalize_terms(required)
    if not required_terms:
        return 0.0
    return round((len(overlap(required_terms, available)) / len(required_terms)) * 100, 2)
