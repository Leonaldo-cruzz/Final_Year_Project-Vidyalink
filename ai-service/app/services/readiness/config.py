"""Versioned Industry Readiness Score configuration.

The weights are deliberately centralized. A future scoring change should create
a new version instead of mutating historical results produced by version 1.0.
"""

SCORING_VERSION = "1.0"

# Portfolio quality reflects the strongest directly evaluated project evidence.
# Technical skills measure evidence-backed capability, not a raw skill count.
# GitHub adds independently observed activity and documentation evidence.
# ATS readiness measures resume discoverability and presentation quality.
# Verified achievements reward only backend-verified artifacts and associations.
# Career alignment connects verified evidence to the student's selected target role.
WEIGHTS = {
    "portfolioQuality": 30,
    "technicalSkillProfile": 20,
    "githubEvidence": 15,
    "atsReadiness": 15,
    "verifiedAchievements": 10,
    "careerAlignment": 10,
}

GITHUB_SUBWEIGHTS = {
    "repositoryActivity": 25,
    "recentActivity": 25,
    "commitEvidence": 25,
    "languageUsage": 10,
    "documentation": 15,
}

SKILL_SUBWEIGHTS = {
    "confidence": 40,
    "independentSources": 20,
    "verifiedProjectUsage": 15,
    "githubEvidence": 10,
    "certificateEvidence": 7.5,
    "alumniEndorsements": 7.5,
}

CATEGORY_RANGES = {
    "Highly Industry Ready": (90, 100),
    "Industry Ready": (80, 90),
    "Progressing": (70, 80),
    "Developing": (60, 70),
    "Needs Development": (0, 60),
}

