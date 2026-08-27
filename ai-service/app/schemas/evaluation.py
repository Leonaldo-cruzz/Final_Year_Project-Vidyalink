"""Schemas for portfolio evaluation requests and responses."""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class PortfolioEvaluationRequest(BaseModel):
    """Payload schema for evaluating student portfolio data."""

    studentId: str = Field(
        ...,
        description="Unique identifier of the student",
        min_length=1,
    )
    portfolioId: str = Field(
        ...,
        description="Unique identifier of the portfolio record",
        min_length=1,
    )
    verificationStatus: str = Field(
        ...,
        description="Verification status; must be VERIFIED",
    )
    resume: Dict[str, Any] = Field(
        default_factory=dict,
        description="Verified student resume metadata or structured sections",
    )
    projects: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of verified student projects",
    )
    certificates: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of verified student certificates",
    )
    github: Dict[str, Any] = Field(
        default_factory=dict,
        description="Verified GitHub analytics/repository metadata",
    )
    skills: List[Union[str, Dict[str, Any]]] = Field(
        default_factory=list,
        description="List of verified or extracted student skills",
    )

    @field_validator("studentId", "portfolioId")
    @classmethod
    def validate_non_empty_strings(cls, value: str, info) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError(f"{info.field_name} must not be empty or whitespace only")
        return trimmed

    @field_validator("verificationStatus")
    @classmethod
    def validate_verification_status(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized != "VERIFIED":
            raise ValueError("Only portfolios with verificationStatus 'VERIFIED' are eligible for evaluation")
        return normalized

    @field_validator("projects", "certificates")
    @classmethod
    def validate_items_are_dicts(cls, items: List[Any], info) -> List[Dict[str, Any]]:
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Each item in '{info.field_name}' must be an object/dict (item at index {idx} is invalid)")
        return items

    @field_validator("resume", "github")
    @classmethod
    def validate_dict_fields(cls, value: Any, info) -> Dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError(f"'{info.field_name}' must be an object/dict")
        return value


class EvaluationResultData(BaseModel):
    """Data payload for evaluation response in pending state."""

    status: str = Field(
        default="evaluation_pending",
        description="Current evaluation status",
    )
    portfolioScore: Optional[float] = Field(
        default=None,
        description="Overall portfolio score (null while pending)",
    )
    atsScore: Optional[float] = Field(
        default=None,
        description="ATS compatibility score (null while pending)",
    )
    githubScore: Optional[float] = Field(
        default=None,
        description="GitHub activity score (null while pending)",
    )
    industryReadinessScore: Optional[float] = Field(
        default=None,
        description="Industry readiness score (null while pending)",
    )
    skills: List[Any] = Field(
        default_factory=list,
        description="List of evaluated skills",
    )
    skillGaps: List[Any] = Field(
        default_factory=list,
        description="Identified skill gaps",
    )
    recommendations: List[Any] = Field(
        default_factory=list,
        description="Actionable recommendations",
    )


class PortfolioEvaluationResponse(BaseModel):
    """Standard success response wrapper for portfolio evaluation."""

    success: bool = True
    data: EvaluationResultData


class DimensionScoreBreakdown(BaseModel):
    """Breakdown schema for an individual scoring dimension."""

    score: float = Field(..., description="Raw score between 0 and 100")
    weight: int = Field(..., description="Weight percentage allocated to this dimension")
    weightedScore: float = Field(..., description="Score multiplied by weight percentage")
    evidence: List[str] = Field(default_factory=list, description="Measurable facts that substantiate the score")
    explanation: str = Field(..., description="Human-readable explanation of dimensional score")


class PortfolioScoreBreakdown(BaseModel):
    """Complete 6-dimension score breakdown."""

    projectComplexity: DimensionScoreBreakdown
    technologyStack: DimensionScoreBreakdown
    githubActivity: DimensionScoreBreakdown
    documentationQuality: DimensionScoreBreakdown
    innovation: DimensionScoreBreakdown
    codeQuality: DimensionScoreBreakdown


class PortfolioScoreResultData(BaseModel):
    """Data payload returned by the portfolio evaluation engine."""

    portfolioScore: float = Field(..., description="Final weighted portfolio score (0-100)")
    category: str = Field(..., description="Descriptive classification category")
    breakdown: PortfolioScoreBreakdown
    evaluatedAt: str = Field(..., description="ISO 8601 timestamp when evaluated")
    version: str = Field(default="1.0", description="Scoring engine version")


class PortfolioScoreResponse(BaseModel):
    """Standard response model for POST /api/v1/evaluation/portfolio/score."""

    success: bool = True
    data: PortfolioScoreResultData
