"""Technology Stack Scorer.

Evaluates technology diversity, modern frameworks, full-stack tier coverage,
database systems, cloud infrastructure, and verified technical skills.
"""

from typing import Any, Dict, List, Set


def score_technology_stack(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate technology stack score (0-100) based on verified skills and project technologies."""
    skills_raw: List[Any] = payload.get("skills") or []
    projects: List[Dict[str, Any]] = payload.get("projects") or []
    certificates: List[Dict[str, Any]] = payload.get("certificates") or []
    evidence: List[str] = []

    # Aggregate unique normalized skills & technologies
    project_techs: Set[str] = set()
    for proj in projects:
        for t in (proj.get("technologies") or []):
            if isinstance(t, str) and t.strip():
                project_techs.add(t.strip().lower())

    verified_skills: Set[str] = set()
    for s in skills_raw:
        if isinstance(s, str) and s.strip():
            verified_skills.add(s.strip().lower())
        elif isinstance(s, dict) and s.get("name"):
            verified_skills.add(str(s["name"]).strip().lower())

    all_techs = project_techs.union(verified_skills)

    if not all_techs and not certificates:
        return {
            "score": 0.0,
            "evidence": ["No verified skills, project technologies, or technical certificates detected."],
            "explanation": "Portfolio contains no documented technology stack.",
        }

    points = 0.0
    evidence.append(f"Detected {len(all_techs)} distinct technical competencies across verified projects and skills.")

    # 1. Diversity & Volume (up to 25 pts)
    # 1-2 techs = 10 pts, 3-4 = 18 pts, 5+ = 25 pts
    tech_count = len(all_techs)
    if tech_count >= 6:
        points += 25.0
        evidence.append("High technology diversity with 6+ active tools/frameworks.")
    elif tech_count >= 4:
        points += 18.0
        evidence.append("Balanced technology diversity with 4-5 active tools/frameworks.")
    elif tech_count >= 2:
        points += 12.0
        evidence.append("Foundational technical coverage (2-3 tools).")
    else:
        points += 6.0

    # Categorization buckets for ecosystem coverage
    modern_frontend = {"react", "next.js", "nextjs", "vue", "angular", "svelte", "typescript", "tailwind", "vite"}
    modern_backend = {"node.js", "nodejs", "express", "fastapi", "django", "spring boot", "spring", "nest.js", "nestjs", "golang", "go"}
    database_systems = {"mongodb", "postgresql", "postgres", "mysql", "redis", "dynamodb", "sqlite", "prisma", "mongoose", "supabase", "elasticsearch"}
    cloud_devops = {"docker", "kubernetes", "aws", "azure", "gcp", "github actions", "ci/cd", "terraform", "linux", "nginx"}
    ai_data = {"python", "pandas", "numpy", "pytorch", "tensorflow", "scikit-learn", "langchain", "openai", "gemini", "data analysis"}

    found_fe = [t for t in all_techs if any(k in t for k in modern_frontend)]
    found_be = [t for t in all_techs if any(k in t for k in modern_backend)]
    found_db = [t for t in all_techs if any(k in t for k in database_systems)]
    found_cloud = [t for t in all_techs if any(k in t for k in cloud_devops)]
    found_ai_data = [t for t in all_techs if any(k in t for k in ai_data)]

    # 2. Modern Core Web / API Stacks (up to 30 pts)
    if found_fe and found_be:
        points += 20.0
        evidence.append("Modern full-stack pairing detected across client and server tiers.")
    elif found_fe or found_be:
        points += 10.0
        evidence.append("Specialized modern tier detected.")

    if found_db:
        points += 10.0
        evidence.append(f"Enterprise data persistence verified ({', '.join(list(found_db)[:2])}).")

    # 3. Cloud / DevOps & Infrastructure (up to 20 pts)
    if found_cloud:
        points += min(20.0, len(found_cloud) * 10.0)
        evidence.append(f"DevOps/Cloud skills detected ({', '.join(list(found_cloud)[:2])}).")

    # 4. Advanced / Emerging Tech or Data (up to 15 pts)
    if found_ai_data:
        points += 10.0
        evidence.append(f"Data engineering / AI / Advanced scripting skills verified ({', '.join(list(found_ai_data)[:2])}).")

    # 5. Technical Certifications Bonus (up to 10 pts)
    if certificates:
        cert_pts = min(10.0, len(certificates) * 5.0)
        points += cert_pts
        evidence.append(f"{len(certificates)} verified professional technical certificate(s) included.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Technology stack scored at {final_score:.1f}/100 based on coverage across frontend, "
        f"backend, database systems, DevOps infrastructure, and certified competencies."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
