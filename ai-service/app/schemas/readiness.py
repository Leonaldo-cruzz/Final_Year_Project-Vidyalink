"""Strict contracts for the deterministic Industry Readiness Score Engine."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    """Reject unknown fields so the internal contract cannot drift silently."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


def _finite_number(value: float, field_name: str) -> float:
    if value != value or value in (float("inf"), float("-inf")):
        raise ValueError(f"{field_name} must be a finite number")
    return value


class PortfolioEvaluationInput(StrictModel):
    portfolioScore: float = Field(default=0, description="Stored portfolio evaluator score")
    breakdown: dict[str, Any] = Field(default_factory=dict)
    version: str | None = None
    scoringVersion: str | None = None

    @field_validator("portfolioScore")
    @classmethod
    def validate_score(cls, value: float) -> float:
        return _finite_number(value, "portfolioScore")


class ATSEvaluationInput(StrictModel):
    atsScore: float = Field(default=0, description="Stored ATS evaluator score")
    breakdown: dict[str, Any] = Field(default_factory=dict)
    version: str | None = None
    scoringVersion: str | None = None

    @field_validator("atsScore")
    @classmethod
    def validate_score(cls, value: float) -> float:
        return _finite_number(value, "atsScore")


class GitHubAnalyticsInput(StrictModel):
    repositoryCount: int = Field(default=0, ge=0)
    activeRepositoryCount: int = Field(default=0, ge=0)
    commitCount: int = Field(default=0, ge=0)
    recentCommitCount: int = Field(default=0, ge=0)
    readmeCoverage: float = Field(default=0, ge=0, le=100)
    documentationCoverage: float = Field(default=0, ge=0, le=100)
    languages: list[str] = Field(default_factory=list)
    analyticsVersion: str | None = None
    recentActivityDate: str | None = None


class SkillEvidenceInput(StrictModel):
    name: str = ""
    canonicalName: str | None = None
    category: str | None = None
    sources: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    evidenceCount: int = Field(default=0, ge=0)
    confidence: float = Field(default=0, ge=0, le=1)
    verified: bool = True
    verifiedProjectUsage: bool = False
    githubEvidence: bool = False
    certificateEvidence: bool = False
    alumniEndorsements: bool = False


class SkillProfileInput(StrictModel):
    skills: list[str | SkillEvidenceInput] = Field(default_factory=list)
    version: str | None = None


class MatchedSkillInput(StrictModel):
    name: str = ""
    canonicalName: str | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    sources: list[str] = Field(default_factory=list)
    isRequired: bool = True


class WeakEvidenceSkillInput(StrictModel):
    name: str = ""
    canonicalName: str | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    reason: str = ""


class SkillGapAnalysisInput(StrictModel):
    missingRequiredSkills: list[str] = Field(default_factory=list)
    missingPreferredSkills: list[str] = Field(default_factory=list)
    weakEvidenceSkills: list[WeakEvidenceSkillInput | str] = Field(default_factory=list)
    targetRole: str = ""
    matchedSkills: list[MatchedSkillInput | str] = Field(default_factory=list)
    matchPercentage: float | None = Field(default=None, ge=0, le=100)
    portfolioDomain: str = ""
    projectTitle: str = ""
    projectTechnologies: list[str] = Field(default_factory=list)
    projectRelevance: float | None = Field(default=None, ge=0, le=100)
    analysisVersion: str | None = None


class VerifiedAchievementInput(StrictModel):
    type: str
    label: str
    verified: bool = True
    evidence: list[str] = Field(default_factory=list)


class IndustryReadinessRequest(StrictModel):
    """Server-built snapshot of already verified evaluation signals."""

    studentId: str = Field(..., min_length=1)
    portfolioId: str = Field(..., min_length=1)
    verificationStatus: Literal["VERIFIED"]
    portfolioEvaluation: PortfolioEvaluationInput = Field(default_factory=PortfolioEvaluationInput)
    atsEvaluation: ATSEvaluationInput = Field(default_factory=ATSEvaluationInput)
    githubAnalytics: GitHubAnalyticsInput = Field(default_factory=GitHubAnalyticsInput)
    skillProfile: SkillProfileInput = Field(default_factory=SkillProfileInput)
    skillGapAnalysis: SkillGapAnalysisInput = Field(default_factory=SkillGapAnalysisInput)
    recommendations: list[Any] = Field(default_factory=list)
    verifiedAchievements: list[VerifiedAchievementInput] = Field(default_factory=list)

    @field_validator("studentId", "portfolioId")
    @classmethod
    def validate_identifier(cls, value: str, info) -> str:
        value = value.strip()
        if not value:
            raise ValueError(f"{info.field_name} must not be empty")
        return value


class DimensionResult(StrictModel):
    score: float = Field(..., ge=0, le=100)
    weight: int = Field(..., ge=0, le=100)
    weightedScore: float = Field(..., ge=0, le=100)
    evidence: list[str] = Field(default_factory=list)
    explanation: str
    details: dict[str, Any] = Field(default_factory=dict)


class ReadinessBreakdown(StrictModel):
    portfolioQuality: DimensionResult
    technicalSkillProfile: DimensionResult
    githubEvidence: DimensionResult
    atsReadiness: DimensionResult
    verifiedAchievements: DimensionResult
    careerAlignment: DimensionResult


class IndustryReadinessResultData(StrictModel):
    industryReadinessScore: float = Field(..., ge=0, le=100)
    category: Literal[
        "Highly Industry Ready",
        "Industry Ready",
        "Progressing",
        "Developing",
        "Needs Development",
    ]
    breakdown: ReadinessBreakdown
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    topRecommendations: list[Any] = Field(default_factory=list)
    scoringVersion: str
    generatedAt: str
    sourceVersions: dict[str, str | None] = Field(default_factory=dict)


class IndustryReadinessResponse(StrictModel):
    success: Literal[True] = True
    data: IndustryReadinessResultData
