"""GitHub analytics data contracts."""

from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class GithubAnalyticsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    repository_count: int | None = Field(default=None, ge=0, validation_alias=AliasChoices("repository_count", "repositoryCount"))
    commit_count: int | None = Field(default=None, ge=0, validation_alias=AliasChoices("commit_count", "commitCount"))
    commit_frequency: float | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("commit_frequency", "commitFrequency", "commits_per_week"),
    )
    recent_commits: int | list[Any] | None = Field(
        default=None,
        validation_alias=AliasChoices("recent_commits", "recentCommits"),
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
    public_repository_count: int | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("public_repository_count", "publicRepositoryCount"),
    )
    project_activity: float | None = Field(
        default=None,
        ge=0,
        le=100,
        validation_alias=AliasChoices("project_activity", "projectActivity"),
    )


class GithubAnalyticsResponse(BaseModel):
    factual_metrics: dict[str, Any]
    derived_activity_score: float
    observations: list[str]
    derived_score: float
    derived_category: str
    explanation: list[str]
    limitations: list[str]
