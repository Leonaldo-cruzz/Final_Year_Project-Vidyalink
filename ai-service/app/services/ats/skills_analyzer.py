"""Technical skills analyzer module for ATS evaluation."""

import re
from typing import Any, Dict, List, Optional, Set

# Curated technical skill taxonomy across software engineering categories
SKILL_TAXONOMY: Dict[str, List[str]] = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "c", "go", "golang",
        "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "dart", "sql", "html", "css",
    ],
    "frameworks": [
        "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "angular", "svelte",
        "node.js", "nodejs", "express", "express.js", "fastapi", "django", "flask",
        "spring", "spring boot", "nestjs", "asp.net", "laravel", "rails", "flutter",
    ],
    "databases": [
        "mongodb", "postgresql", "postgres", "mysql", "sqlite", "redis", "dynamodb",
        "cassandra", "oracle", "mariadb", "elasticsearch", "supabase", "firebase", "prisma", "mongoose",
    ],
    "cloud": [
        "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "terraform", "ci/cd", "github actions", "jenkins", "gitlab ci", "nginx", "linux",
    ],
    "tools": [
        "git", "github", "gitlab", "postman", "jira", "webpack", "vite", "babel",
        "jest", "pytest", "mocha", "vitest", "cypress", "playwright", "figma",
    ],
}


def analyze_technical_skills(
    normalized_text: str,
    target_job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Detect and categorize technical skills from resume and match against target requirements."""
    evidence: List[str] = []

    if not normalized_text:
        return {
            "score": 0.0,
            "evidence": ["No resume text provided to analyze technical skills."],
            "explanation": "Cannot detect technical skills from empty content.",
            "matchedSkills": [],
            "missingSkills": [],
            "detectedSkills": [],
            "categorizedSkills": {},
        }

    lower_text = normalized_text.lower()
    target_job = target_job or {}

    # 1. Detect all technical skills present in resume text
    detected_by_category: Dict[str, List[str]] = {}
    all_detected_skills: Set[str] = set()

    for category, skill_list in SKILL_TAXONOMY.items():
        detected_by_category[category] = []
        for skill in skill_list:
            # Word boundary matching for accurate recognition (e.g. avoid 'c' matching inside 'react')
            if skill in ["c", "r"]:
                pat = r"(?:^|[\s,;/\(])" + re.escape(skill) + r"(?:$|[\s,;/\)])"
            elif skill in ["c++", "c#"]:
                pat = r"\b" + re.escape(skill)
            else:
                pat = r"\b" + re.escape(skill) + r"\b"

            if re.search(pat, lower_text):
                detected_by_category[category].append(skill)
                all_detected_skills.add(skill)

    detected_list = sorted(list(all_detected_skills))

    # 2. Compare against target job skills if provided
    raw_job_skills = (target_job.get("requiredSkills") or []) + (target_job.get("preferredSkills") or [])
    job_skills_normalized = [s.strip().lower() for s in raw_job_skills if isinstance(s, str) and s.strip()]

    matched_skills: List[str] = []
    missing_skills: List[str] = []

    if job_skills_normalized:
        for j_skill in job_skills_normalized:
            # Check direct detection or sub-match
            if j_skill in all_detected_skills or any(j_skill in d or d in j_skill for d in all_detected_skills):
                matched_skills.append(j_skill)
            else:
                missing_skills.append(j_skill)

        total_req = len(job_skills_normalized)
        match_pct = (len(matched_skills) / total_req) * 100.0
        points = match_pct
        evidence.append(f"Matched {len(matched_skills)}/{total_req} target job skills ({match_pct:.1f}%).")
        if missing_skills:
            evidence.append(f"Missing {len(missing_skills)} requested skill(s): {', '.join(missing_skills[:5])}.")
    else:
        # General technical competence scoring based on category breadth and volume
        points = 0.0
        # Diversity across categories (languages, frameworks, databases, cloud, tools)
        active_categories = sum(1 for cat, s_list in detected_by_category.items() if len(s_list) > 0)
        points += min(40.0, active_categories * 8.0)

        # Total skills volume
        total_skills = len(all_detected_skills)
        if total_skills >= 10:
            points += 40.0
        elif total_skills >= 6:
            points += 30.0
        elif total_skills >= 3:
            points += 20.0
        else:
            points += 10.0

        # Tier pairing bonus (languages + frameworks + db)
        if detected_by_category["languages"] and detected_by_category["frameworks"]:
            points += 10.0
        if detected_by_category["databases"] or detected_by_category["cloud"]:
            points += 10.0

        evidence.append(f"Detected {total_skills} distinct technical skills across {active_categories} categories.")
        matched_skills = detected_list

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Technical skills scored at {final_score:.1f}/100 based on {len(all_detected_skills)} "
        f"detected competencies across languages, frameworks, databases, cloud, and developer tooling."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
        "matchedSkills": matched_skills,
        "missingSkills": missing_skills,
        "detectedSkills": detected_list,
        "categorizedSkills": detected_by_category,
    }
