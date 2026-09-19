"""Controlled-vocabulary skill extraction and skill-gap analysis."""

from __future__ import annotations

import re
from collections import OrderedDict

from src.models.portfolio import PortfolioSubmission, SkillGapResponse


# The vocabulary is intentionally local and extendable. A detected skill must
# appear in one of these entries; free-form text never creates a new skill.
SKILL_ALIASES: OrderedDict[str, tuple[str, ...]] = OrderedDict(
    [
        ("Python", ("python",)),
        ("Java", ("java",)),
        ("JavaScript", ("javascript", "js")),
        ("TypeScript", ("typescript", "ts")),
        ("C++", ("c++", "cpp")),
        ("React", ("react", "reactjs", "react.js")),
        ("Node.js", ("node.js", "nodejs", "node")),
        ("Express", ("express", "express.js", "expressjs")),
        ("FastAPI", ("fastapi", "fast api")),
        ("MongoDB", ("mongodb", "mongo db", "mongo")),
        ("PostgreSQL", ("postgresql", "postgres")),
        ("Docker", ("docker",)),
        ("Kubernetes", ("kubernetes", "k8s")),
        ("Git", ("git",)),
        ("GitHub", ("github", "github.com")),
        ("Linux", ("linux",)),
        ("AWS", ("aws", "amazon web services")),
        ("TensorFlow", ("tensorflow",)),
        ("PyTorch", ("pytorch",)),
        ("Machine Learning", ("machine learning", "machine-learning")),
        ("Deep Learning", ("deep learning", "deep-learning")),
        ("NLP", ("nlp", "natural language processing")),
        ("SQL", ("sql",)),
        ("REST APIs", ("rest apis", "rest api", "restful apis", "restful api", "rest")),
        ("Redis", ("redis",)),
        ("GraphQL", ("graphql",)),
        ("Next.js", ("next.js", "nextjs", "next")),
        ("Tailwind CSS", ("tailwind css", "tailwindcss", "tailwind")),
        ("HTML/CSS", ("html/css", "html", "css", "html5", "css3")),
    ]
)


def canonicalize_skill(value: str) -> str | None:
    normalized = value.strip().casefold()
    if not normalized:
        return None
    for canonical, aliases in SKILL_ALIASES.items():
        if normalized == canonical.casefold() or normalized in aliases:
            return canonical
    return None


def normalize_skill_list(values: list[str]) -> list[str]:
    return sorted({canonical for value in values if (canonical := canonicalize_skill(value))})


def _add_source(
    sources: dict[str, set[str]],
    confidence: dict[str, float],
    skill: str,
    source: str,
    source_confidence: float,
) -> None:
    sources.setdefault(skill, set()).add(source)
    confidence[skill] = max(confidence.get(skill, 0.0), source_confidence)


def _find_skills_in_text(text: str) -> list[str]:
    if not text:
        return []
    found: set[str] = set()
    # Longest aliases first prevents a short alias from taking precedence in
    # phrases such as "natural language processing".
    aliases = sorted(
        ((alias, canonical) for canonical, values in SKILL_ALIASES.items() for alias in values),
        key=lambda pair: len(pair[0]),
        reverse=True,
    )
    for alias, canonical in aliases:
        pattern = rf"(?<!\w){re.escape(alias)}(?!\w)"
        if re.search(pattern, text, flags=re.IGNORECASE):
            found.add(canonical)
    return sorted(found)


def extract_skills(portfolio: PortfolioSubmission) -> dict:
    sources: dict[str, set[str]] = {}
    confidence: dict[str, float] = {}

    for raw_skill in portfolio.skills:
        if canonical := canonicalize_skill(raw_skill):
            _add_source(sources, confidence, canonical, "profile.skills", 1.0)

    for index, project in enumerate(portfolio.projects, start=1):
        project_label = project.title or f"project_{index}"
        for raw_skill in project.technologies:
            if canonical := canonicalize_skill(raw_skill):
                _add_source(sources, confidence, canonical, f"project:{project_label}.technologies", 1.0)
        for field_name, text in (
            ("description", project.description),
            ("documentation", project.documentation if isinstance(project.documentation, str) else ""),
        ):
            for canonical in _find_skills_in_text(text):
                _add_source(sources, confidence, canonical, f"project:{project_label}.{field_name}", 0.8)

    if portfolio.resume:
        for canonical in _find_skills_in_text(portfolio.resume.text):
            _add_source(sources, confidence, canonical, "resume.text", 0.8)

    return {
        "detected_skills": sorted(sources),
        "skill_sources": {skill: sorted(values) for skill, values in sorted(sources.items())},
        "confidence": {skill: round(confidence[skill], 2) for skill in sorted(confidence)},
    }


ROLE_SKILLS: dict[str, list[str]] = {
    "python developer": ["Python", "Git", "SQL"],
    "backend developer": ["Python", "Node.js", "SQL", "Git"],
    "frontend developer": ["JavaScript", "TypeScript", "React", "Next.js", "HTML/CSS", "Git"],
    "full stack developer": ["JavaScript", "React", "Node.js", "Express", "MongoDB", "SQL", "Git"],
    "data scientist": ["Python", "SQL", "Machine Learning", "TensorFlow"],
    "machine learning engineer": ["Python", "Machine Learning", "Deep Learning", "PyTorch", "SQL"],
    "devops engineer": ["Linux", "Docker", "Kubernetes", "AWS", "Git"],
}


def skill_gap(student_skills: list[str], target_role: str | None, required_skills: list[str]) -> SkillGapResponse:
    normalized_student = set(normalize_skill_list(student_skills))
    requested = required_skills or (ROLE_SKILLS.get((target_role or "").strip().casefold(), []) if target_role else [])
    normalized_required: list[str] = []
    for raw_skill in requested:
        canonical = canonicalize_skill(raw_skill) or raw_skill.strip()
        if canonical and canonical not in normalized_required:
            normalized_required.append(canonical)

    normalized_required = sorted(normalized_required)

    if not normalized_required:
        return SkillGapResponse(
            target_role=target_role,
            required_skills=[],
            matched_skills=[],
            missing_skills=[],
            coverage_percentage=0.0,
            recommendations=["Not enough information to calculate skill gap. Please specify a target role or required skills."],
            recommended_learning_areas=[],
        )

    matched = sorted(skill for skill in normalized_required if skill in normalized_student)
    missing = sorted(skill for skill in normalized_required if skill not in normalized_student)
    coverage = round((len(matched) / len(normalized_required)) * 100, 2)
    learning = [
        f"Build evidence for {skill} through a verified project, coursework, or certification."
        for skill in missing
    ]
    return SkillGapResponse(
        target_role=target_role,
        required_skills=normalized_required,
        matched_skills=matched,
        missing_skills=missing,
        coverage_percentage=coverage,
        recommendations=learning,
        recommended_learning_areas=learning,
    )
