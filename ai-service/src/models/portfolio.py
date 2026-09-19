"""Portfolio, skill, and recommendation data contracts."""

from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class Education(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = Field(default=None, ge=1950, le=2200)


class Certificate(BaseModel):
    name: str
    issuer: str | None = None
    verification_url: str | None = None
    verified: bool = False


class Project(BaseModel):
    """A project supplied by the backend; only verified projects are scored."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)
    technologies: list[str] = Field(default_factory=list)
    github_url: str | None = Field(default=None, validation_alias=AliasChoices("github_url", "githubUrl"))
    demo_url: str | None = Field(default=None, validation_alias=AliasChoices("demo_url", "demoUrl"))
    deployment_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("deployment_url", "deploymentUrl", "demo_url", "demoUrl", "live_deployment", "liveDeployment"),
    )
    deployment_status: str | None = Field(
        default=None,
        validation_alias=AliasChoices("deployment_status", "deploymentStatus"),
    )
    documentation: str | dict[str, Any] | None = None
    complexity_indicators: list[str] | dict[str, Any] = Field(
        default_factory=list,
        validation_alias=AliasChoices("complexity_indicators", "complexityIndicators"),
    )
    innovation_indicators: list[str] | dict[str, Any] = Field(
        default_factory=list,
        validation_alias=AliasChoices("innovation_indicators", "innovationIndicators"),
    )
    code_quality_indicators: list[str] | dict[str, Any] = Field(
        default_factory=list,
        validation_alias=AliasChoices("code_quality_indicators", "codeQualityIndicators"),
    )
    verified: bool = Field(
        default=False,
        validation_alias=AliasChoices("verified", "is_verified", "isVerified"),
    )
    verification_status: str | None = Field(
        default=None,
        validation_alias=AliasChoices("verification_status", "verificationStatus"),
    )

    @property
    def is_verified(self) -> bool:
        return self.verified or (self.verification_status or "").lower() == "verified"


class ProjectEvaluation(BaseModel):
    """Evaluation result for an individual project."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: str
    project_score: float = Field(ge=0, le=100)
    component_scores: dict[str, float]
    evidence: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    deployment_url: str | None = None
    deployment_status: str | None = None
    github_url: str | None = None


class ResumeInfo(BaseModel):
    text: str = Field(default="", max_length=50000)
    updated_at: str | None = None


class GithubInfo(BaseModel):
    repository_count: int = Field(default=0, ge=0, validation_alias=AliasChoices("repository_count", "repositoryCount"))
    commit_count: int = Field(default=0, ge=0, validation_alias=AliasChoices("commit_count", "commitCount"))
    commit_frequency: float | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("commit_frequency", "commitFrequency", "commits_per_week"),
    )
    languages: dict[str, float] | list[str] = Field(default_factory=dict)
    contribution_activity: float | None = Field(
        default=None,
        ge=0,
        le=100,
        validation_alias=AliasChoices("contribution_activity", "contributionActivity"),
    )
    recent_activity: bool | None = Field(
        default=None,
        validation_alias=AliasChoices("recent_activity", "recentActivity"),
    )
    repository_visibility: dict[str, int] | None = Field(
        default=None,
        validation_alias=AliasChoices("repository_visibility", "repositoryVisibility"),
    )
    project_activity: float | None = Field(
        default=None,
        ge=0,
        le=100,
        validation_alias=AliasChoices("project_activity", "projectActivity"),
    )


class PortfolioSubmission(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    student_id: str | None = Field(default=None, validation_alias=AliasChoices("student_id", "studentId"))
    name: str | None = None
    skills: list[str] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    certificates: list[Certificate] = Field(default_factory=list)
    resume: ResumeInfo | None = None
    github: GithubInfo | None = None
    career_interests: list[str] = Field(default_factory=list, validation_alias=AliasChoices("career_interests", "careerInterests"))
    graduation_year: int | None = Field(default=None, ge=1950, le=2200, validation_alias=AliasChoices("graduation_year", "graduationYear"))

    @field_validator("resume", mode="before")
    @classmethod
    def normalize_resume(cls, value: Any) -> Any:
        if isinstance(value, str):
            return {"text": value}
        return value


class SkillExtractionResponse(BaseModel):
    detected_skills: list[str]
    skill_sources: dict[str, list[str]]
    confidence: dict[str, float]


class SkillGapRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    current_skills: list[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("current_skills", "currentSkills", "student_skills", "studentSkills"),
    )
    target_role: str | None = Field(default=None, validation_alias=AliasChoices("target_role", "targetRole"))
    required_skills: list[str] = Field(default_factory=list, validation_alias=AliasChoices("required_skills", "requiredSkills"))


class SkillGapResponse(BaseModel):
    target_role: str | None
    required_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    coverage_percentage: float
    recommendations: list[str]
    recommended_learning_areas: list[str]


class RecommendationCandidate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    name: str
    title: str | None = None
    organization: str | None = None
    skills: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    description: str | None = None
    graduation_year: int | None = Field(default=None, ge=1950, le=2200, validation_alias=AliasChoices("graduation_year", "graduationYear"))
    required_skills: list[str] = Field(default_factory=list, validation_alias=AliasChoices("required_skills", "requiredSkills"))


class RecommendationsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    technical_skills: list[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("technical_skills", "technicalSkills", "student_skills", "studentSkills"),
    )
    project_domain: str | None = None
    project_domains: list[str] = Field(default_factory=list, validation_alias=AliasChoices("project_domains", "projectDomains"))
    technologies: list[str] = Field(default_factory=list)
    career_interests: list[str] = Field(default_factory=list, validation_alias=AliasChoices("career_interests", "careerInterests"))
    graduation_year: int | None = Field(default=None, ge=1950, le=2200, validation_alias=AliasChoices("graduation_year", "graduationYear"))
    portfolio_score: float | None = Field(default=None, ge=0, le=100, validation_alias=AliasChoices("portfolio_score", "portfolioScore"))
    target_skills: list[str] = Field(default_factory=list, validation_alias=AliasChoices("target_skills", "targetSkills"))
    available_alumni_mentors: list[RecommendationCandidate] = Field(
        default_factory=list,
        validation_alias=AliasChoices("available_alumni_mentors", "availableAlumniMentors", "alumni_mentors"),
    )
    available_job_opportunities: list[RecommendationCandidate] = Field(
        default_factory=list,
        validation_alias=AliasChoices("available_job_opportunities", "availableJobOpportunities", "recruiter_opportunities"),
    )
