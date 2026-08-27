"""Unified Student Skill Extraction and Aggregation Engine."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.services.skills.extractors import (
    extract_from_resume,
    extract_from_projects,
    extract_from_certificates,
    extract_from_github,
    extract_from_endorsements,
)

SOURCE_BASE_CONFIDENCE = {
    "project": 0.55,
    "certificate": 0.55,
    "github": 0.50,
    "endorsement": 0.50,
    "resume": 0.45,
}

MULTI_SOURCE_BOOSTERS = {
    1: 0.0,
    2: 0.20,
    3: 0.32,
    4: 0.40,
    5: 0.45,
}


def calculate_skill_confidence(sources: List[str], evidence_count: int) -> float:
    """Calculate an explainable confidence score (0.0 - 1.0) based on source diversity and evidence count."""
    if not sources:
        return 0.0

    # Highest base confidence among active sources
    highest_base = max(SOURCE_BASE_CONFIDENCE.get(s, 0.40) for s in sources)

    # Multi-source diversity booster
    unique_sources_count = len(set(sources))
    booster = MULTI_SOURCE_BOOSTERS.get(unique_sources_count, 0.45)

    # Small boost for multiple distinct evidence citations
    evidence_booster = min(0.08, (evidence_count - 1) * 0.02) if evidence_count > 1 else 0.0

    raw_confidence = highest_base + booster + evidence_booster
    return min(0.98, round(raw_confidence, 2))


def extract_unified_skills(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract, aggregate, and normalize skills across all verified portfolio assets."""
    student_id = str(payload.get("studentId") or "")
    resume_data = payload.get("resume") or {}
    projects = payload.get("projects") or []
    certificates = payload.get("certificates") or []
    github_data = payload.get("github") or {}
    endorsements = payload.get("endorsements") or []

    # 1. Collect raw extractions from each verified source
    raw_extractions: List[Dict[str, Any]] = []
    raw_extractions.extend(extract_from_resume(resume_data))
    raw_extractions.extend(extract_from_projects(projects))
    raw_extractions.extend(extract_from_certificates(certificates))
    raw_extractions.extend(extract_from_github(github_data))
    raw_extractions.extend(extract_from_endorsements(endorsements))

    # 2. Group by canonicalName
    skills_map: Dict[str, Dict[str, Any]] = {}

    for item in raw_extractions:
        canon = item["canonicalName"]
        if canon not in skills_map:
            skills_map[canon] = {
                "name": item["name"],
                "canonicalName": canon,
                "category": item["category"],
                "sources": [],
                "evidence": [],
            }

        # Add source if not already tracked
        if item["source"] not in skills_map[canon]["sources"]:
            skills_map[canon]["sources"].append(item["source"])

        # Add unique evidence
        if item["evidence"] not in skills_map[canon]["evidence"]:
            skills_map[canon]["evidence"].append(item["evidence"])

    # 3. Build unified skill records with explainable confidence
    unified_skills: List[Dict[str, Any]] = []

    for canon, data in skills_map.items():
        sources_list = data["sources"]
        evidence_list = data["evidence"]
        confidence = calculate_skill_confidence(sources_list, len(evidence_list))

        unified_skills.append({
            "name": data["name"],
            "canonicalName": canon,
            "category": data["category"],
            "sources": sources_list,
            "evidence": evidence_list,
            "evidenceCount": len(evidence_list),
            "confidence": confidence,
        })

    # Sort skills by confidence (descending), then by name
    unified_skills.sort(key=lambda s: (-s["confidence"], s["name"]))

    return {
        "studentId": student_id,
        "skills": unified_skills,
        "totalSkillsCount": len(unified_skills),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
    }
