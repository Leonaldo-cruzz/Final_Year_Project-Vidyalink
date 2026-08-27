"""Skill Gap Analysis Engine comparing unified student skills against target role profiles."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.services.skills.normalizer import normalize_skill


def analyze_skill_gap(
    student_skills: List[Dict[str, Any]],
    target_role: Dict[str, Any],
) -> Dict[str, Any]:
    """Identify matched skills, missing required/preferred skills, and weak-evidence proficiencies."""
    target_role = target_role or {}
    role_title = target_role.get("title") or "Target Role"

    raw_required = target_role.get("requiredSkills") or []
    raw_preferred = target_role.get("preferredSkills") or []

    # Map student skills by canonicalName
    student_skills_map: Dict[str, Dict[str, Any]] = {}
    for s in student_skills:
        if isinstance(s, dict) and s.get("canonicalName"):
            student_skills_map[s["canonicalName"]] = s
        elif isinstance(s, str):
            norm = normalize_skill(s)
            if norm:
                student_skills_map[norm["canonicalName"]] = {
                    "name": norm["name"],
                    "canonicalName": norm["canonicalName"],
                    "category": norm["category"],
                    "confidence": 0.50,
                    "sources": ["declared"],
                    "evidence": [],
                }

    # Normalize required & preferred target skills
    matched_skills = []
    missing_required = []
    missing_preferred = []
    weak_evidence_skills = []

    # Check Required Skills
    for req in raw_required:
        req_norm = normalize_skill(str(req))
        if not req_norm:
            continue

        canon = req_norm["canonicalName"]
        if canon in student_skills_map:
            st_skill = student_skills_map[canon]
            matched_entry = {
                "name": req_norm["name"],
                "canonicalName": canon,
                "category": req_norm["category"],
                "confidence": st_skill.get("confidence", 0.50),
                "sources": st_skill.get("sources", []),
                "isRequired": True,
            }
            matched_skills.append(matched_entry)

            # Check weak evidence threshold (< 0.60)
            if st_skill.get("confidence", 0.50) < 0.60:
                weak_evidence_skills.append({
                    "name": req_norm["name"],
                    "canonicalName": canon,
                    "confidence": st_skill.get("confidence", 0.50),
                    "reason": "Single source or low evidence breadth",
                })
        else:
            missing_required.append(req_norm["name"])

    # Check Preferred Skills
    for pref in raw_preferred:
        pref_norm = normalize_skill(str(pref))
        if not pref_norm:
            continue

        canon = pref_norm["canonicalName"]
        if canon in student_skills_map:
            st_skill = student_skills_map[canon]
            # Avoid duplicate match entry if skill was already required
            if not any(m["canonicalName"] == canon for m in matched_skills):
                matched_entry = {
                    "name": pref_norm["name"],
                    "canonicalName": canon,
                    "category": pref_norm["category"],
                    "confidence": st_skill.get("confidence", 0.50),
                    "sources": st_skill.get("sources", []),
                    "isRequired": False,
                }
                matched_skills.append(matched_entry)

                if st_skill.get("confidence", 0.50) < 0.60:
                    weak_evidence_skills.append({
                        "name": pref_norm["name"],
                        "canonicalName": canon,
                        "confidence": st_skill.get("confidence", 0.50),
                        "reason": "Single source or low evidence breadth",
                    })
        else:
            if pref_norm["name"] not in missing_preferred:
                missing_preferred.append(pref_norm["name"])

    # Compute match percentage
    total_req_count = len(raw_required)
    matched_req_count = total_req_count - len(missing_required)

    if total_req_count > 0:
        match_pct = round((matched_req_count / total_req_count) * 100.0, 1)
    else:
        match_pct = 100.0 if not raw_preferred else round((len(matched_skills) / max(1, len(raw_preferred))) * 100.0, 1)

    return {
        "targetRole": role_title,
        "matchedSkills": matched_skills,
        "missingRequiredSkills": missing_required,
        "missingPreferredSkills": missing_preferred,
        "weakEvidenceSkills": weak_evidence_skills,
        "matchPercentage": match_pct,
        "analysisVersion": "1.0",
        "analyzedAt": datetime.now(timezone.utc).isoformat(),
    }
