"""Schemas for portfolio evaluation, ATS resume analysis, GitHub analytics, and Skill intelligence."""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


# ===========================================================================
# Portfolio Evaluation Schemas
# ===========================================================================

class PortfolioEvaluationRequest(BaseModel):
    """Payload schema for evaluating student portfolio data."""

    studentId: str = Field(..., description="Unique identifier of the student", min_length=1)
    portfolioId: str = Field(..., description="Unique identifier of the portfolio record", min_length=1)
    verificationStatus: str = Field(..., description="Verification status; must be VERIFIED")
    resume: Dict[str, Any] = Field(default_factory=dict, description="Verified student resume metadata")
    projects: List[Dict[str, Any]] = Field(default_factory=list, description="List of verified student projects")
    certificates: List[Dict[str, Any]] = Field(default_factory=list, description="List of verified student certificates")
    github: Dict[str, Any] = Field(default_factory=dict, description="Verified GitHub analytics/repository metadata")
    skills: List[Union[str, Dict[str, Any]]] = Field(default_factory=list, description="List of verified or extracted student skills")

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

    status: str = Field(default="evaluation_pending", description="Current evaluation status")
    portfolioScore: Optional[float] = Field(default=None, description="Overall portfolio score (null while pending)")
    atsScore: Optional[float] = Field(default=None, description="ATS compatibility score (null while pending)")
    githubScore: Optional[float] = Field(default=None, description="GitHub activity score (null while pending)")
    industryReadinessScore: Optional[float] = Field(default=None, description="Industry readiness score (null while pending)")
    skills: List[Any] = Field(default_factory=list, description="List of evaluated skills")
    skillGaps: List[Any] = Field(default_factory=list, description="Identified skill gaps")
    recommendations: List[Any] = Field(default_factory=list, description="Actionable recommendations")


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


# ===========================================================================
# ATS Resume Analysis Schemas
# ===========================================================================

class TargetJobSchema(BaseModel):
    """Target job specification for ATS matching."""

    title: Optional[str] = Field(default="", description="Target job title")
    description: Optional[str] = Field(default="", description="Target job description")
    requiredSkills: List[str] = Field(default_factory=list, description="Must-have required skills")
    preferredSkills: List[str] = Field(default_factory=list, description="Nice-to-have preferred skills")


class ResumePayloadSchema(BaseModel):
    """Resume content payload for extraction and analysis."""

    text: Optional[str] = Field(default=None, description="Direct plain text resume content")
    fileName: Optional[str] = Field(default=None, description="Original filename")
    mimeType: Optional[str] = Field(default="application/pdf", description="MIME type of resume")
    fileContentBase64: Optional[str] = Field(default=None, description="Base64-encoded PDF/text file content")


class ATSResumeEvaluationRequest(BaseModel):
    """Input contract for POST /api/v1/evaluation/resume/ats."""

    studentId: str = Field(..., description="Unique identifier of the student", min_length=1)
    portfolioId: str = Field(..., description="Unique identifier of the portfolio record", min_length=1)
    verificationStatus: str = Field(..., description="Verification status; must be VERIFIED")
    resume: Dict[str, Any] = Field(default_factory=dict, description="Verified resume data/content")
    targetJob: Optional[TargetJobSchema] = Field(default=None, description="Optional target job specification")

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
            raise ValueError("Only resumes with verificationStatus 'VERIFIED' are eligible for ATS evaluation")
        return normalized


class ATSDimensionScoreBreakdown(BaseModel):
    """Individual ATS dimensional score breakdown."""

    score: float = Field(..., description="Raw score between 0 and 100")
    weight: int = Field(..., description="Weight percentage allocated to this dimension")
    weightedScore: float = Field(..., description="Score multiplied by weight percentage")
    evidence: List[str] = Field(default_factory=list, description="Measurable indicators supporting the score")
    explanation: str = Field(..., description="Explanation of dimensional performance")


class ATSScoreBreakdown(BaseModel):
    """Full 5-dimension ATS breakdown."""

    keywordMatching: ATSDimensionScoreBreakdown
    formatting: ATSDimensionScoreBreakdown
    technicalSkills: ATSDimensionScoreBreakdown
    experience: ATSDimensionScoreBreakdown
    education: ATSDimensionScoreBreakdown


class ATSScoreResultData(BaseModel):
    """Result data structure for ATS resume evaluation."""

    atsScore: float = Field(..., description="Overall weighted ATS compatibility score (0-100)")
    category: str = Field(..., description="Descriptive classification category")
    breakdown: ATSScoreBreakdown
    matchedSkills: List[str] = Field(default_factory=list, description="Skills detected in resume matching requirements")
    missingSkills: List[str] = Field(default_factory=list, description="Target job skills missing from resume")
    missingKeywords: List[str] = Field(default_factory=list, description="Important target keywords missing from resume")
    detectedSections: List[str] = Field(default_factory=list, description="Standard resume sections detected")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations to improve ATS score")
    scoringVersion: str = Field(default="1.0", description="ATS scoring engine version")
    evaluatedAt: str = Field(..., description="ISO 8601 evaluation timestamp")


class ATSScoreResponse(BaseModel):
    """Standard success response wrapper for POST /api/v1/evaluation/resume/ats."""

    success: bool = True
    data: ATSScoreResultData


# ===========================================================================
# GitHub Analytics Schemas
# ===========================================================================

class GitHubAnalyticsPayloadSchema(BaseModel):
    """Normalized GitHub activity and repository analytics metadata."""

    repositoryCount: int = Field(default=0, ge=0, description="Total public repositories count")
    activeRepositoryCount: int = Field(default=0, ge=0, description="Repositories with activity within last 90 days")
    totalStars: int = Field(default=0, ge=0, description="Total stargazers across repositories")
    totalForks: int = Field(default=0, ge=0, description="Total forks across repositories")
    languages: List[str] = Field(default_factory=list, description="Programming languages detected across repositories")
    commitCount: int = Field(default=0, ge=0, description="Total commits recorded")
    recentCommitCount: int = Field(default=0, ge=0, description="Commits recorded in the recent active period")
    contributionActivity: Dict[str, Any] = Field(default_factory=dict, description="Activity indicators from GitHub profile")
    readmeCoverage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage of repositories with README")
    documentationCoverage: float = Field(default=0.0, ge=0.0, le=100.0, description="Documentation coverage percentage")


class GitHubAnalysisRequest(BaseModel):
    """Input payload contract for POST /api/v1/evaluation/github/analyze."""

    studentId: str = Field(..., description="Unique identifier of the student", min_length=1)
    portfolioId: str = Field(..., description="Unique identifier of the portfolio record", min_length=1)
    github: GitHubAnalyticsPayloadSchema = Field(default_factory=GitHubAnalyticsPayloadSchema, description="GitHub analytics metrics")

    @field_validator("studentId", "portfolioId")
    @classmethod
    def validate_non_empty_strings(cls, value: str, info) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError(f"{info.field_name} must not be empty or whitespace only")
        return trimmed


class GitHubAnalysisResultData(BaseModel):
    """Normalized GitHub analytics output with factual observations."""

    status: str = Field(default="analyzed", description="Analysis status")
    analyticsVersion: str = Field(default="1.0", description="Analytics engine version")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Normalized metrics object")
    observations: List[str] = Field(default_factory=list, description="Factual activity observations")


class GitHubAnalysisResponse(BaseModel):
    """Standard success response wrapper for POST /api/v1/evaluation/github/analyze."""

    success: bool = True
    data: GitHubAnalysisResultData


# ===========================================================================
# Skill Intelligence Schemas (Extraction & Gap Analysis)
# ===========================================================================

class ExtractedSkillItem(BaseModel):
    """Individual extracted skill with source lineage and confidence."""

    name: str = Field(..., description="Display name of the skill")
    canonicalName: str = Field(..., description="Canonical taxonomy key")
    category: str = Field(..., description="Skill category classification")
    sources: List[str] = Field(default_factory=list, description="Verified sources providing evidence for this skill")
    evidence: List[str] = Field(default_factory=list, description="Specific evidence citations")
    evidenceCount: int = Field(default=1, ge=0, description="Total evidence occurrences")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Evidence-backed confidence score")


class SkillExtractionRequest(BaseModel):
    """Input contract for POST /api/v1/evaluation/skills/extract."""

    studentId: str = Field(..., description="Unique identifier of the student", min_length=1)
    portfolioId: str = Field(..., description="Unique identifier of the portfolio record", min_length=1)
    verificationStatus: str = Field(..., description="Verification status; must be VERIFIED")
    resume: Dict[str, Any] = Field(default_factory=dict, description="Verified resume data")
    projects: List[Dict[str, Any]] = Field(default_factory=list, description="List of verified student projects")
    certificates: List[Dict[str, Any]] = Field(default_factory=list, description="List of verified student certificates")
    github: Dict[str, Any] = Field(default_factory=dict, description="Verified GitHub analytics metadata")
    endorsements: List[Dict[str, Any]] = Field(default_factory=list, description="Verified alumni / mentor endorsements")

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
            raise ValueError("Only verified portfolios with verificationStatus 'VERIFIED' are eligible for skill extraction")
        return normalized


class SkillExtractionResultData(BaseModel):
    """Result data structure for extracted student skills."""

    studentId: str = Field(..., description="Student ID")
    skills: List[ExtractedSkillItem] = Field(default_factory=list, description="Extracted unified skills")
    totalSkillsCount: int = Field(default=0, description="Count of extracted unique skills")
    generatedAt: str = Field(..., description="ISO 8601 generation timestamp")
    version: str = Field(default="1.0", description="Skill extraction engine version")


class SkillExtractionResponse(BaseModel):
    """Standard success response wrapper for POST /api/v1/evaluation/skills/extract."""

    success: bool = True
    data: SkillExtractionResultData


class TargetRoleSchema(BaseModel):
    """Target role specification for skill gap analysis."""

    title: Optional[str] = Field(default="Target Role", description="Target job/role title")
    requiredSkills: List[str] = Field(default_factory=list, description="Required must-have skills")
    preferredSkills: List[str] = Field(default_factory=list, description="Preferred nice-to-have skills")


class SkillGapAnalysisRequest(BaseModel):
    """Input contract for POST /api/v1/evaluation/skills/gap-analysis."""

    studentId: str = Field(..., description="Unique identifier of the student", min_length=1)
    skills: List[Union[Dict[str, Any], str]] = Field(default_factory=list, description="Student's extracted skills")
    targetRole: TargetRoleSchema = Field(default_factory=TargetRoleSchema, description="Target role requirements")

    @field_validator("studentId")
    @classmethod
    def validate_non_empty_student_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("studentId must not be empty or whitespace only")
        return trimmed


class SkillGapResultData(BaseModel):
    """Result data structure for skill gap analysis."""

    targetRole: str = Field(..., description="Target role title evaluated")
    matchedSkills: List[Dict[str, Any]] = Field(default_factory=list, description="Skills matching target role")
    missingRequiredSkills: List[str] = Field(default_factory=list, description="Required skills missing from profile")
    missingPreferredSkills: List[str] = Field(default_factory=list, description="Preferred skills missing from profile")
    weakEvidenceSkills: List[Dict[str, Any]] = Field(default_factory=list, description="Skills with low evidence or confidence")
    matchPercentage: float = Field(..., ge=0.0, le=100.0, description="Role required match percentage")
    analysisVersion: str = Field(default="1.0", description="Analysis version")
    analyzedAt: str = Field(..., description="ISO 8601 analysis timestamp")


class SkillGapAnalysisResponse(BaseModel):
    """Standard success response wrapper for POST /api/v1/evaluation/skills/gap-analysis."""

    success: bool = True
    data: SkillGapResultData
