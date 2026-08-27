"""GitHub Activity Scorer.

Evaluates available GitHub profile & repository metadata, commit activity,
language diversity, community engagement (stars/forks), and recency.
"""

from typing import Any, Dict, List


def score_github_activity(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate GitHub activity score (0-100) based on verified GitHub metadata."""
    github: Dict[str, Any] = payload.get("github") or {}
    evidence: List[str] = []

    if not github or not any(github.values()):
        return {
            "score": 0.0,
            "evidence": ["No verified GitHub account or activity records linked."],
            "explanation": "Portfolio has no connected GitHub profile data to evaluate.",
        }

    points = 0.0

    # 1. Repository volume (up to 25 pts)
    repo_count = int(github.get("repositoryCount") or github.get("publicRepos") or 0)
    if repo_count >= 10:
        points += 25.0
        evidence.append(f"Substantial repository portfolio ({repo_count} public repositories).")
    elif repo_count >= 5:
        points += 18.0
        evidence.append(f"Active repository portfolio ({repo_count} public repositories).")
    elif repo_count >= 1:
        points += 10.0
        evidence.append(f"Foundational repository presence ({repo_count} repository).")
    else:
        evidence.append("No public repositories detected on linked GitHub account.")

    # 2. Commit Activity & Contribution History (up to 30 pts)
    commits = int(github.get("commitCount") or github.get("recentCommits") or 0)
    contributions = int(github.get("contributionActivity") or github.get("totalContributions") or 0)
    total_activity_metrics = commits + contributions

    if total_activity_metrics >= 100:
        points += 30.0
        evidence.append(f"High continuous development activity ({total_activity_metrics} recorded commits/contributions).")
    elif total_activity_metrics >= 30:
        points += 20.0
        evidence.append(f"Moderate commit cadence ({total_activity_metrics} recorded commits/contributions).")
    elif total_activity_metrics >= 5:
        points += 12.0
        evidence.append(f"Early commit history recorded ({total_activity_metrics} commits/contributions).")
    else:
        # Fallback if specific counts not populated but account exists
        if repo_count > 0:
            points += 5.0

    # 3. Community Engagement: Stars & Forks (up to 20 pts)
    stars = int(github.get("stars") or github.get("totalStars") or 0)
    forks = int(github.get("forks") or github.get("totalForks") or 0)

    if stars >= 20 or forks >= 10:
        points += 20.0
        evidence.append(f"Strong community recognition ({stars} stars, {forks} forks).")
    elif stars >= 5 or forks >= 2:
        points += 12.0
        evidence.append(f"Community engagement present ({stars} stars, {forks} forks).")
    elif stars >= 1 or forks >= 1:
        points += 6.0
        evidence.append(f"Initial community interactions ({stars} stars, {forks} forks).")

    # 4. Language Diversity (up to 15 pts)
    languages = github.get("languages") or []
    if isinstance(languages, dict):
        languages = list(languages.keys())

    if len(languages) >= 4:
        points += 15.0
        evidence.append(f"Broad polyglot language distribution across repos ({len(languages)} languages: {', '.join(languages[:3])}...).")
    elif len(languages) >= 2:
        points += 10.0
        evidence.append(f"Multi-language repository activity ({len(languages)} languages).")
    elif len(languages) == 1:
        points += 5.0
        evidence.append(f"Primary repository language: {languages[0]}.")

    # 5. Profile & Repository Completeness / Hygiene (up to 10 pts)
    if github.get("readmePresent") or github.get("profileReadme"):
        points += 5.0
        evidence.append("Profile or repository README documentation verified.")

    if github.get("lastActivity") or github.get("recentActivity"):
        points += 5.0
        evidence.append("Recent development activity timestamp confirmed.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"GitHub activity scored at {final_score:.1f}/100 based on repository volume, "
        f"commit frequency, language breadth, and public collaboration signals."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
