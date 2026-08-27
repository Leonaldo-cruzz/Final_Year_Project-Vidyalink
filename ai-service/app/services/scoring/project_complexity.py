"""Project Complexity Scorer.

Evaluates architectural breadth, full-stack tiers, persistence, authentication,
integrations, live deployment, and multi-component project scope.
"""

from typing import Any, Dict, List


def score_project_complexity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate project complexity score (0-100) based on verified project metadata."""
    projects: List[Dict[str, Any]] = payload.get("projects") or []
    evidence: List[str] = []

    if not projects:
        return {
            "score": 0.0,
            "evidence": ["No verified projects available in portfolio."],
            "explanation": "Portfolio contains no verified projects to evaluate complexity.",
        }

    points = 0.0
    project_count = len(projects)
    evidence.append(f"Portfolio contains {project_count} verified project(s).")

    # 1. Base project volume points (up to 20 pts)
    volume_pts = min(20.0, project_count * 10.0)
    points += volume_pts

    # Keyword classifiers for indicators across projects
    frontend_keywords = {"react", "vue", "angular", "next", "svelte", "html", "css", "tailwind", "vite", "flutter", "react native"}
    backend_keywords = {"node", "express", "fastapi", "django", "flask", "spring", "nest", "go", "gin", "asp.net", "laravel"}
    db_keywords = {"mongodb", "postgres", "postgresql", "mysql", "sqlite", "redis", "prisma", "mongoose", "dynamodb", "supabase", "firebase"}
    auth_keywords = {"jwt", "oauth", "auth0", "firebase auth", "passport", "bcrypt", "rbac", "session"}
    deployment_keywords = {"docker", "kubernetes", "aws", "gcp", "azure", "vercel", "netlify", "render", "railway", "heroku", "ci/cd"}

    has_frontend = False
    has_backend = False
    has_db = False
    has_auth = False
    has_deployment_metadata = False
    has_live_url = False
    has_demo_video = False
    has_repo = False
    has_multi_member = False
    max_tech_in_single_proj = 0

    for idx, proj in enumerate(projects):
        techs = [str(t).lower().strip() for t in (proj.get("technologies") or [])]
        desc = str(proj.get("description") or "").lower()
        title = proj.get("title", f"Project #{idx + 1}")
        all_text = " ".join(techs) + " " + desc

        if len(techs) > max_tech_in_single_proj:
            max_tech_in_single_proj = len(techs)

        if any(k in all_text for k in frontend_keywords):
            has_frontend = True
        if any(k in all_text for k in backend_keywords):
            has_backend = True
        if any(k in all_text for k in db_keywords):
            has_db = True
        if any(k in all_text for k in auth_keywords):
            has_auth = True
        if any(k in all_text for k in deployment_keywords):
            has_deployment_metadata = True

        if proj.get("liveDeployment") or proj.get("liveUrl"):
            has_live_url = True
        if proj.get("demoVideo"):
            has_demo_video = True
        if proj.get("githubRepository") or proj.get("githubUrl"):
            has_repo = True
        if (proj.get("teamMembers") and len(proj.get("teamMembers", [])) > 1):
            has_multi_member = True

    # 2. Architectural tiers (up to 30 pts)
    if has_frontend and has_backend:
        points += 20.0
        evidence.append("Full-stack architecture verified (Frontend + Backend components detected).")
    elif has_frontend or has_backend:
        points += 10.0
        tier_name = "Frontend" if has_frontend else "Backend"
        evidence.append(f"Dedicated {tier_name} tier detected.")

    if has_db:
        points += 10.0
        evidence.append("Data persistence layer verified (Database/ORM integration detected).")

    # 3. Authentication & Security (up to 15 pts)
    if has_auth:
        points += 15.0
        evidence.append("Access control / Authentication mechanisms integrated.")

    # 4. Deployment & Deliverables (up to 20 pts)
    if has_live_url:
        points += 12.0
        evidence.append("Live production deployment URL verified.")
    elif has_deployment_metadata:
        points += 6.0
        evidence.append("Cloud or containerized deployment metadata detected.")

    if has_demo_video:
        points += 4.0
        evidence.append("Demo video walkthrough provided.")

    if has_repo:
        points += 4.0
        evidence.append("Public / accessible source code repository linked.")

    # 5. Scope & Technology Depth (up to 15 pts)
    if max_tech_in_single_proj >= 5:
        points += 10.0
        evidence.append(f"Multi-faceted stack integration (Project uses {max_tech_in_single_proj} distinct technologies).")
    elif max_tech_in_single_proj >= 3:
        points += 5.0
        evidence.append(f"Moderate technology stack depth ({max_tech_in_single_proj} technologies in main project).")

    if has_multi_member:
        points += 5.0
        evidence.append("Collaborative team-based project structure detected.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Project complexity evaluated at {final_score:.1f}/100 across {project_count} project(s), "
        f"factoring architectural tiers, data persistence, authentication, and deployment readiness."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
