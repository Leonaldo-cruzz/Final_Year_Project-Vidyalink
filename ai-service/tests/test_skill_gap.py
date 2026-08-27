"""Tests for the unified skill engine (aggregation + confidence) and gap analyzer."""

import pytest
from app.services.skills.skill_engine import extract_unified_skills, calculate_skill_confidence
from app.services.skills.gap_analyzer import analyze_skill_gap

# ===========================================================================
# Fixtures
# ===========================================================================

STRONG_FULLSTACK_PAYLOAD = {
    "studentId": "student-001",
    "portfolioId": "portfolio-001",
    "verificationStatus": "VERIFIED",
    "resume": {"text": "React, Node.js, MongoDB, TypeScript, Docker"},
    "projects": [
        {
            "title": "VidyaLink Platform",
            "description": "React frontend with Node.js backend and MongoDB",
            "technologies": ["React", "Node.js", "MongoDB", "FastAPI"],
        }
    ],
    "certificates": [
        {
            "title": "Docker Essentials",
            "issuer": "Docker Inc",
            "skills": ["Docker"],
        }
    ],
    "github": {"languages": ["JavaScript", "Python", "TypeScript"]},
    "endorsements": [
        {
            "endorserName": "Dr. Sharma",
            "skills": ["React", "Node.js"],
        }
    ],
}

FRONTEND_ONLY_PAYLOAD = {
    "studentId": "student-002",
    "portfolioId": "portfolio-002",
    "verificationStatus": "VERIFIED",
    "resume": {"text": "React, JavaScript, CSS, Tailwind CSS"},
    "projects": [
        {
            "title": "Portfolio Site",
            "description": "Personal site in React",
            "technologies": ["React", "JavaScript"],
        }
    ],
    "certificates": [],
    "github": {"languages": ["JavaScript", "CSS"]},
    "endorsements": [],
}

MINIMAL_PAYLOAD = {
    "studentId": "student-003",
    "portfolioId": "portfolio-003",
    "verificationStatus": "VERIFIED",
    "resume": {"text": "Microsoft Office, Word, Excel"},
    "projects": [],
    "certificates": [],
    "github": {},
    "endorsements": [],
}

EMPTY_PAYLOAD = {
    "studentId": "student-004",
    "portfolioId": "portfolio-004",
    "verificationStatus": "VERIFIED",
    "resume": {},
    "projects": [],
    "certificates": [],
    "github": {},
    "endorsements": [],
}

# ===========================================================================
# Confidence Calculation Tests
# ===========================================================================


class TestConfidenceCalculation:
    def test_single_source_lower_confidence(self):
        conf = calculate_skill_confidence(["resume"], 1)
        assert conf < 0.70

    def test_two_sources_increases_confidence(self):
        single = calculate_skill_confidence(["resume"], 1)
        dual = calculate_skill_confidence(["resume", "project"], 2)
        assert dual > single

    def test_four_sources_high_confidence(self):
        conf = calculate_skill_confidence(["resume", "project", "github", "endorsement"], 4)
        assert conf >= 0.80

    def test_five_sources_near_maximum(self):
        conf = calculate_skill_confidence(
            ["resume", "project", "certificate", "github", "endorsement"], 5
        )
        assert conf >= 0.90

    def test_confidence_never_exceeds_cap(self):
        conf = calculate_skill_confidence(
            ["resume", "project", "certificate", "github", "endorsement"], 10
        )
        assert conf <= 0.98

    def test_empty_sources_returns_zero(self):
        conf = calculate_skill_confidence([], 0)
        assert conf == 0.0


# ===========================================================================
# Unified Skill Engine Tests
# ===========================================================================


class TestExtractUnifiedSkills:
    def test_strong_student_has_react(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        canon_names = [s["canonicalName"] for s in result["skills"]]
        assert "react" in canon_names

    def test_strong_student_has_mongodb(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        canon_names = [s["canonicalName"] for s in result["skills"]]
        assert "mongodb" in canon_names

    def test_react_has_multiple_sources_in_strong_payload(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        react_skill = next((s for s in result["skills"] if s["canonicalName"] == "react"), None)
        assert react_skill is not None
        # React appears in resume, project, and endorsement
        assert len(react_skill["sources"]) >= 2

    def test_react_higher_confidence_than_weak_skill(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        react = next((s for s in result["skills"] if s["canonicalName"] == "react"), None)
        assert react is not None
        assert react["confidence"] >= 0.60

    def test_no_duplicate_skills_in_results(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        canon_names = [s["canonicalName"] for s in result["skills"]]
        assert len(canon_names) == len(set(canon_names)), "Duplicate skills detected"

    def test_totalSkillsCount_matches_length(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        assert result["totalSkillsCount"] == len(result["skills"])

    def test_generatedAt_present(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        assert "generatedAt" in result
        assert result["generatedAt"]

    def test_version_is_1_0(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        assert result["version"] == "1.0"

    def test_frontend_student_has_react_but_no_docker(self):
        result = extract_unified_skills(FRONTEND_ONLY_PAYLOAD)
        canon_names = [s["canonicalName"] for s in result["skills"]]
        assert "react" in canon_names
        assert "docker" not in canon_names

    def test_minimal_student_extracts_very_few_or_no_skills(self):
        result = extract_unified_skills(MINIMAL_PAYLOAD)
        # Microsoft Office etc. should not appear in tech taxonomy
        assert result["totalSkillsCount"] == 0 or result["totalSkillsCount"] < 3

    def test_empty_portfolio_returns_empty_skills(self):
        result = extract_unified_skills(EMPTY_PAYLOAD)
        assert result["totalSkillsCount"] == 0
        assert result["skills"] == []

    def test_skills_sorted_by_confidence_descending(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        confidences = [s["confidence"] for s in result["skills"]]
        assert confidences == sorted(confidences, reverse=True)

    def test_evidence_list_not_empty_for_any_skill(self):
        result = extract_unified_skills(STRONG_FULLSTACK_PAYLOAD)
        for skill in result["skills"]:
            assert len(skill["evidence"]) >= 1, f"Empty evidence for skill: {skill['canonicalName']}"


# ===========================================================================
# Skill Gap Analyzer Tests
# ===========================================================================


FULLSTACK_SKILLS = [
    {"name": "React", "canonicalName": "react", "category": "frontend", "confidence": 0.85, "sources": ["resume", "project", "endorsement"]},
    {"name": "Node.js", "canonicalName": "node.js", "category": "backend", "confidence": 0.75, "sources": ["resume", "project"]},
    {"name": "MongoDB", "canonicalName": "mongodb", "category": "database", "confidence": 0.65, "sources": ["project"]},
    {"name": "TypeScript", "canonicalName": "typescript", "category": "programming_language", "confidence": 0.55, "sources": ["github"]},
]

FRONTEND_SKILLS = [
    {"name": "React", "canonicalName": "react", "category": "frontend", "confidence": 0.80, "sources": ["resume", "project"]},
    {"name": "JavaScript", "canonicalName": "javascript", "category": "programming_language", "confidence": 0.65, "sources": ["resume", "github"]},
]


class TestGapAnalyzer:
    def test_fullstack_matches_react_and_nodejs(self):
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "Full Stack Developer",
                "requiredSkills": ["React", "Node.js", "MongoDB"],
                "preferredSkills": ["Docker", "AWS"],
            },
        )
        matched_canonical = [m["canonicalName"] for m in gap["matchedSkills"]]
        assert "react" in matched_canonical
        assert "node.js" in matched_canonical
        assert "mongodb" in matched_canonical

    def test_missing_docker_and_aws_for_fullstack(self):
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "Full Stack Developer",
                "requiredSkills": ["React", "Node.js"],
                "preferredSkills": ["Docker", "AWS"],
            },
        )
        assert "Docker" in gap["missingPreferredSkills"]
        assert "AWS" in gap["missingPreferredSkills"]

    def test_alias_in_target_role_matches_correctly(self):
        """Job description uses 'ReactJS' alias — must match student's 'react' canonical."""
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "Frontend Engineer",
                "requiredSkills": ["ReactJS", "Node.js"],
                "preferredSkills": [],
            },
        )
        matched_canonical = [m["canonicalName"] for m in gap["matchedSkills"]]
        assert "react" in matched_canonical

    def test_frontend_student_missing_backend_skills(self):
        gap = analyze_skill_gap(
            student_skills=FRONTEND_SKILLS,
            target_role={
                "title": "Full Stack Developer",
                "requiredSkills": ["React", "Node.js", "MongoDB"],
                "preferredSkills": [],
            },
        )
        assert "Node.js" in gap["missingRequiredSkills"]
        assert "MongoDB" in gap["missingRequiredSkills"]

    def test_weak_evidence_flagged_below_threshold(self):
        """TypeScript has confidence 0.55 < 0.60 — should appear in weakEvidenceSkills when matched."""
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "TypeScript Developer",
                "requiredSkills": ["TypeScript"],
                "preferredSkills": [],
            },
        )
        weak_canonical = [w["canonicalName"] for w in gap["weakEvidenceSkills"]]
        assert "typescript" in weak_canonical

    def test_match_percentage_all_required_present(self):
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "Full Stack Developer",
                "requiredSkills": ["React", "Node.js", "MongoDB"],
                "preferredSkills": [],
            },
        )
        assert gap["matchPercentage"] == 100.0

    def test_match_percentage_partial(self):
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "DevOps Engineer",
                "requiredSkills": ["Docker", "Kubernetes", "AWS"],
                "preferredSkills": [],
            },
        )
        assert gap["matchPercentage"] == 0.0

    def test_empty_student_skills_all_missing(self):
        gap = analyze_skill_gap(
            student_skills=[],
            target_role={
                "title": "Backend Developer",
                "requiredSkills": ["Node.js", "PostgreSQL"],
                "preferredSkills": ["Docker"],
            },
        )
        assert len(gap["matchedSkills"]) == 0
        assert "Node.js" in gap["missingRequiredSkills"]
        assert "PostgreSQL" in gap["missingRequiredSkills"]
        assert "Docker" in gap["missingPreferredSkills"]

    def test_no_duplicate_in_matched_skills(self):
        """React appears in both requiredSkills and preferredSkills — should match only once."""
        gap = analyze_skill_gap(
            student_skills=FULLSTACK_SKILLS,
            target_role={
                "title": "UI Dev",
                "requiredSkills": ["React"],
                "preferredSkills": ["React"],  # duplicate
            },
        )
        matched_canonical = [m["canonicalName"] for m in gap["matchedSkills"]]
        assert matched_canonical.count("react") == 1

    def test_analysis_version_is_1_0(self):
        gap = analyze_skill_gap(student_skills=FULLSTACK_SKILLS, target_role={"title": "Dev", "requiredSkills": [], "preferredSkills": []})
        assert gap["analysisVersion"] == "1.0"

    def test_analyzedAt_present(self):
        gap = analyze_skill_gap(student_skills=[], target_role={"title": "Dev", "requiredSkills": [], "preferredSkills": []})
        assert "analyzedAt" in gap
        assert gap["analyzedAt"]
