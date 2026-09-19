"""Scoring response models."""

from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from src.models.portfolio import PortfolioSubmission, ProjectEvaluation


class PortfolioEvaluation(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    category: str
    component_scores: dict[str, float]
    weighted_breakdown: dict[str, float]
    evidence: dict[str, list[str]]
    strengths: list[str]
    improvements: list[str]
    improvement_suggestions: list[str]
    data_completeness: dict[str, Any]
    eligible_project_count: int = Field(ge=0)
    excluded_project_count: int = Field(ge=0)
    evidence_status: str
    project_evaluations: list[ProjectEvaluation] = Field(default_factory=list)


class DeploymentVerificationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str = Field(min_length=1)


class DeploymentVerificationResponse(BaseModel):
    url: str
    status: str  # not_provided, checking, reachable, unreachable, failed
    status_code: int | None = None
    response_time_ms: float | None = None
    message: str = ""


class ReadinessRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    portfolio_score: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("portfolio_score", "portfolioScore"))
    ats_score: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("ats_score", "atsScore", "ATS_score"))
    skills_coverage: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("skills_coverage", "skillsCoverage", "skill_coverage", "skillCoverage"))
    github_activity_score: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("github_activity_score", "githubActivityScore", "github_activity", "githubActivity"))
    verification_completeness: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("verification_completeness", "verificationCompleteness"))
    portfolio: PortfolioSubmission | None = None


class ReadinessResponse(BaseModel):
    readiness_score: float
    category: str
    level: str
    component_scores: dict[str, float | None]
    strengths: list[str]
    gaps: list[str]
    next_steps: list[str]
    recommended_next_steps: list[str]
    evidence_status: str


class RecommendationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    name: str
    title: str | None = None
    organization: str | None = None
    match_score: float = Field(validation_alias=AliasChoices("match_score", "matchScore"))
    matchScore: float | None = None
    reason: str
    alumni_id: str | None = Field(default=None, validation_alias=AliasChoices("alumni_id", "alumniId"))
    alumniId: str | None = None
    opportunity_id: str | None = Field(default=None, validation_alias=AliasChoices("opportunity_id", "opportunityId"))
    opportunityId: str | None = None
    matched_signals: list[str] = Field(default_factory=list, validation_alias=AliasChoices("matched_signals", "matchedSignals"))
    matchedSignals: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list, validation_alias=AliasChoices("matched_skills", "matchedSkills"))
    matchedSkills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list, validation_alias=AliasChoices("missing_skills", "missingSkills"))
    missingSkills: list[str] = Field(default_factory=list)


class RecommendationsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    alumni_mentors: list[RecommendationItem] = Field(default_factory=list, validation_alias=AliasChoices("alumni_mentors", "alumni"))
    alumni: list[RecommendationItem] = Field(default_factory=list)
    recruiter_opportunities: list[RecommendationItem] = Field(default_factory=list, validation_alias=AliasChoices("recruiter_opportunities", "opportunities"))
    opportunities: list[RecommendationItem] = Field(default_factory=list)
    skills_to_develop: list[dict[str, Any]] = Field(default_factory=list, validation_alias=AliasChoices("skills_to_develop", "skills"))
    skills: list[dict[str, Any]] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
