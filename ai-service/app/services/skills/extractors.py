"""Source-specific skill extractors for Resume, Projects, Certificates, GitHub, and Endorsements."""

import re
from typing import Any, Dict, List, Set

from app.services.skills.taxonomy import SKILL_ALIASES, SKILL_TAXONOMY
from app.services.skills.normalizer import normalize_skill
from app.services.resume.parser import parse_resume


def _find_taxonomy_matches_in_text(text: str, source_name: str, evidence_label: str) -> List[Dict[str, Any]]:
    """Scan text for taxonomy keywords and aliases using precise word boundary regex."""
    if not text:
        return []

    lower_text = text.lower()
    matches = []
    seen_canonical = set()

    for alias, canonical_key in SKILL_ALIASES.items():
        if canonical_key in seen_canonical:
            continue

        # Regex boundary logic
        if alias in ["c", "r"]:
            pat = r"(?:^|[\s,;/\(\)\-])" + re.escape(alias) + r"(?:$|[\s,;/\(\)\-])"
        elif alias in ["c++", "c#"]:
            pat = r"\b" + re.escape(alias)
        else:
            pat = r"\b" + re.escape(alias) + r"\b"

        if re.search(pat, lower_text):
            seen_canonical.add(canonical_key)
            meta = SKILL_TAXONOMY.get(canonical_key, {"name": alias.title(), "category": "other"})
            matches.append({
                "name": meta["name"],
                "canonicalName": canonical_key,
                "category": meta["category"],
                "source": source_name,
                "evidence": evidence_label,
            })

    return matches


def extract_from_resume(resume_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract declared skills from verified resume text."""
    if not resume_data or not isinstance(resume_data, dict):
        return []

    parsed = parse_resume(resume_data)
    text = parsed["normalizedText"]
    if not text:
        return []

    return _find_taxonomy_matches_in_text(text, "resume", "Resume: Technical Skills & Profile")


def extract_from_projects(projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract skills from verified student projects (technologies, titles, descriptions)."""
    if not projects:
        return []

    extracted: List[Dict[str, Any]] = []

    for idx, proj in enumerate(projects):
        if not isinstance(proj, dict):
            continue

        proj_title = proj.get("title") or f"Project #{idx + 1}"
        evidence_tag = f"Project: {proj_title}"

        # 1. Direct project technologies array
        techs = proj.get("technologies") or proj.get("techStack") or []
        for t in techs:
            norm = normalize_skill(str(t))
            if norm:
                extracted.append({
                    "name": norm["name"],
                    "canonicalName": norm["canonicalName"],
                    "category": norm["category"],
                    "source": "project",
                    "evidence": evidence_tag,
                })

        # 2. Text scan of project description & architecture
        desc = f"{proj.get('description', '')} {proj.get('detailedDescription', '')}"
        desc_matches = _find_taxonomy_matches_in_text(desc, "project", evidence_tag)
        extracted.extend(desc_matches)

    return extracted


def extract_from_certificates(certificates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract skills from verified technical certificates."""
    if not certificates:
        return []

    extracted: List[Dict[str, Any]] = []

    for idx, cert in enumerate(certificates):
        if not isinstance(cert, dict):
            continue

        cert_title = cert.get("title") or f"Certificate #{idx + 1}"
        evidence_tag = f"Certificate: {cert_title}"

        # Declared skills inside certificate record
        skills_declared = cert.get("skills") or cert.get("skillsVerified") or []
        for s in skills_declared:
            norm = normalize_skill(str(s))
            if norm:
                extracted.append({
                    "name": norm["name"],
                    "canonicalName": norm["canonicalName"],
                    "category": norm["category"],
                    "source": "certificate",
                    "evidence": evidence_tag,
                })

        # Scan title and issuer
        combined_text = f"{cert_title} {cert.get('issuer', '')}"
        title_matches = _find_taxonomy_matches_in_text(combined_text, "certificate", evidence_tag)
        extracted.extend(title_matches)

    return extracted


def extract_from_github(github_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract skills from verified GitHub profile & repository analytics."""
    if not github_data or not isinstance(github_data, dict):
        return []

    extracted: List[Dict[str, Any]] = []

    languages = github_data.get("languages") or []
    if isinstance(languages, dict):
        languages = list(languages.keys())

    for lang in languages:
        norm = normalize_skill(str(lang))
        if norm:
            extracted.append({
                "name": norm["name"],
                "canonicalName": norm["canonicalName"],
                "category": norm["category"],
                "source": "github",
                "evidence": f"GitHub: Public Repository Language ({norm['name']})",
            })

    return extracted


def extract_from_endorsements(endorsements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract skills from verified alumni / mentor endorsements."""
    if not endorsements:
        return []

    extracted: List[Dict[str, Any]] = []

    for end in endorsements:
        if not isinstance(end, dict):
            continue

        endorser_name = end.get("endorserName") or end.get("endorserRole") or "Verified Alumni"
        evidence_tag = f"Endorsement: {endorser_name}"

        skills = end.get("skills") or ([end.get("skill")] if end.get("skill") else [])
        for s in skills:
            if s:
                norm = normalize_skill(str(s))
                if norm:
                    extracted.append({
                        "name": norm["name"],
                        "canonicalName": norm["canonicalName"],
                        "category": norm["category"],
                        "source": "endorsement",
                        "evidence": evidence_tag,
                    })

    return extracted
