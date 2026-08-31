import copy

import pytest


def _base_fixture():
    return {
        "studentId": "student-1",
        "portfolioId": "portfolio-1",
        "verificationStatus": "VERIFIED",
        "portfolioEvaluation": {"portfolioScore": 95, "breakdown": {"evidence": ["Three verified projects"]}, "scoringVersion": "1.0"},
        "atsEvaluation": {"atsScore": 92, "breakdown": {"evidence": ["Standard sections detected"]}, "scoringVersion": "1.0"},
        "githubAnalytics": {
            "repositoryCount": 10,
            "activeRepositoryCount": 9,
            "commitCount": 300,
            "recentCommitCount": 30,
            "readmeCoverage": 100,
            "documentationCoverage": 100,
            "languages": ["JavaScript", "Python", "SQL", "TypeScript", "Go"],
            "analyticsVersion": "1.0",
        },
        "skillProfile": {
            "version": "1.0",
            "skills": [
                {"name": "React", "confidence": 0.95, "sources": ["project", "github", "resume", "certificate"], "verifiedProjectUsage": True, "githubEvidence": True, "certificateEvidence": True, "alumniEndorsements": True},
                {"name": "Node.js", "confidence": 0.95, "sources": ["project", "github", "resume", "certificate"], "verifiedProjectUsage": True, "githubEvidence": True, "certificateEvidence": True, "alumniEndorsements": True},
                {"name": "SQL", "confidence": 0.95, "sources": ["project", "github", "resume", "certificate"], "verifiedProjectUsage": True, "githubEvidence": True, "certificateEvidence": True, "alumniEndorsements": True},
                {"name": "Docker", "confidence": 0.95, "sources": ["project", "github", "resume", "certificate"], "verifiedProjectUsage": True, "githubEvidence": True, "certificateEvidence": True, "alumniEndorsements": True},
                {"name": "Testing", "confidence": 0.95, "sources": ["project", "github", "resume", "certificate"], "verifiedProjectUsage": True, "githubEvidence": True, "certificateEvidence": True, "alumniEndorsements": True},
            ],
        },
        "skillGapAnalysis": {
            "targetRole": "Full Stack Developer",
            "matchedSkills": [
                {"name": "React", "isRequired": True},
                {"name": "Node.js", "isRequired": True},
                {"name": "Docker", "isRequired": True},
            ],
            "missingRequiredSkills": [],
            "missingPreferredSkills": [],
            "weakEvidenceSkills": [],
            "portfolioDomain": "Web Development",
            "projectTitle": "Full Stack Student Portal",
            "projectTechnologies": ["React", "Node.js"],
            "projectRelevance": 100,
            "analysisVersion": "1.0",
        },
        "verifiedAchievements": [
            {"type": "verified_project", "label": "Student Portal"},
            {"type": "verified_project", "label": "Analytics Dashboard"},
            {"type": "verified_project", "label": "Portfolio API"},
            {"type": "verified_certificate", "label": "Cloud Fundamentals"},
            {"type": "verified_certificate", "label": "Web Development"},
            {"type": "verified_certificate", "label": "Database Systems"},
            {"type": "verified_github_association", "label": "GitHub account"},
            {"type": "alumni_endorsement", "label": "Alumni endorsement"},
        ],
        "recommendations": [
            {"entityId": "rec-low", "type": "PROJECT_IMPROVEMENT", "priority": "LOW"},
            {"entityId": "rec-high", "type": "SKILL_IMPROVEMENT", "priority": "HIGH"},
            {"entityId": "rec-medium", "type": "RESUME_IMPROVEMENT", "priority": "MEDIUM"},
        ],
    }


@pytest.fixture
def highly_ready_fixture():
    return _base_fixture()


@pytest.fixture
def medium_fixture():
    fixture = copy.deepcopy(_base_fixture())
    fixture["portfolioEvaluation"]["portfolioScore"] = 75
    fixture["atsEvaluation"]["atsScore"] = 70
    fixture["githubAnalytics"].update({"repositoryCount": 5, "activeRepositoryCount": 3, "commitCount": 100, "recentCommitCount": 6, "readmeCoverage": 60, "documentationCoverage": 60, "languages": ["JavaScript", "Python"]})
    fixture["skillProfile"]["skills"] = [
        {"name": "React", "confidence": 0.7, "sources": ["project", "github"], "verifiedProjectUsage": True, "githubEvidence": True},
        {"name": "Node.js", "confidence": 0.7, "sources": ["project", "github"], "verifiedProjectUsage": True, "githubEvidence": True},
        {"name": "SQL", "confidence": 0.65, "sources": ["project", "certificate"], "verifiedProjectUsage": True, "certificateEvidence": True},
    ]
    fixture["skillGapAnalysis"].update({"matchedSkills": [{"name": "React", "isRequired": True}, {"name": "Node.js", "isRequired": True}, {"name": "SQL", "isRequired": True}, {"name": "Docker", "isRequired": False}], "missingRequiredSkills": ["Kubernetes"], "missingPreferredSkills": [], "weakEvidenceSkills": []})
    fixture["verifiedAchievements"] = [
        {"type": "verified_project", "label": "One project"},
        {"type": "verified_project", "label": "Second project"},
        {"type": "verified_certificate", "label": "One certificate"},
        {"type": "verified_github_association", "label": "GitHub account"},
    ]
    return fixture


@pytest.fixture
def developing_fixture():
    fixture = copy.deepcopy(_base_fixture())
    fixture["portfolioEvaluation"]["portfolioScore"] = 20
    fixture["atsEvaluation"]["atsScore"] = 15
    fixture["githubAnalytics"] = {}
    fixture["skillProfile"] = {"skills": []}
    fixture["skillGapAnalysis"] = {"missingRequiredSkills": ["React"], "missingPreferredSkills": ["AWS"], "weakEvidenceSkills": []}
    fixture["verifiedAchievements"] = []
    fixture["recommendations"] = []
    return fixture

