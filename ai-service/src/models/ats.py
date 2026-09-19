"""ATS analysis data contracts."""

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ATSRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resume_text: str = Field(min_length=1, max_length=50000, validation_alias=AliasChoices("resume_text", "resumeText"))
    target_job_description: str | None = Field(
        default=None,
        max_length=50000,
        validation_alias=AliasChoices("target_job_description", "targetJobDescription", "job_description", "jobDescription"),
    )


class ATSResponse(BaseModel):
    ats_score: float
    keyword_match_score: float
    skills_score: float
    education_score: float
    experience_score: float
    formatting_score: float
    section_completeness: dict[str, bool]
    missing_keywords: list[str]
    detected_skills: list[str]
    suggestions: list[str]
