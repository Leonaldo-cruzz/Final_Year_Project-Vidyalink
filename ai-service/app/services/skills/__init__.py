"""Skill intelligence package."""

from app.services.skills.taxonomy import SKILL_TAXONOMY, SKILL_ALIASES
from app.services.skills.normalizer import normalize_skill, normalize_skill_list
from app.services.skills.extractors import (
    extract_from_resume,
    extract_from_projects,
    extract_from_certificates,
    extract_from_github,
    extract_from_endorsements,
)
from app.services.skills.skill_engine import (
    extract_unified_skills,
    calculate_skill_confidence,
)
from app.services.skills.gap_analyzer import analyze_skill_gap

__all__ = [
    "SKILL_TAXONOMY",
    "SKILL_ALIASES",
    "normalize_skill",
    "normalize_skill_list",
    "extract_from_resume",
    "extract_from_projects",
    "extract_from_certificates",
    "extract_from_github",
    "extract_from_endorsements",
    "extract_unified_skills",
    "calculate_skill_confidence",
    "analyze_skill_gap",
]
