"""Internal FastAPI entry point for VidyaLink recommendations.

Only Express should call this service.  It receives a server-built snapshot,
never browser-provided portfolio scores or candidate records.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.services.recommendation.alumni_matcher import match_alumni
from app.services.recommendation.improvement_recommender import recommend_improvements
from app.services.recommendation.recruiter_matcher import match_recruiter_opportunities
from app.services.recommendation.scoring import ALGORITHM_VERSION


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class ProjectEvidence(APIModel):
    domain: str | None = None
    category: str | None = None
    technologies: list[str] = Field(default_factory=list)
    hasDocumentation: bool = False
    hasProjectEvidence: bool = False
    verified: bool = False


class StudentSnapshot(APIModel):
    student_id: str = Field(alias="studentId")
    skills: list[str] = Field(default_factory=list)
    skill_gaps: list[str] = Field(default_factory=list, alias="skillGaps")
    projects: list[ProjectEvidence] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    portfolio_score: float = Field(ge=0, le=100, alias="portfolioScore")
    ats_score: float | None = Field(default=None, ge=0, le=100, alias="atsScore")
    github_score: float | None = Field(default=None, ge=0, le=100, alias="githubScore")
    experience_years: float = Field(default=0, ge=0, alias="experienceYears")
    verification_evidence: bool = Field(default=False, alias="verificationEvidence")
    evidence: dict = Field(default_factory=dict)

    def matching_dict(self) -> dict:
        data = self.model_dump(by_alias=True)
        data["projects"] = [project.model_dump(by_alias=True) for project in self.projects]
        return data


class AlumniCandidate(APIModel):
    entity_id: str = Field(alias="entityId")
    expertise: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    experience_years: float = Field(default=0, ge=0, alias="experienceYears")
    verified: bool
    active: bool
    visible: bool

    def matching_dict(self) -> dict:
        return self.model_dump(by_alias=True)


class OpportunityCandidate(APIModel):
    entity_id: str = Field(alias="entityId")
    required_skills: list[str] = Field(default_factory=list, alias="requiredSkills")
    preferred_skills: list[str] = Field(default_factory=list, alias="preferredSkills")
    domains: list[str] = Field(default_factory=list)
    minimum_experience_years: float = Field(default=0, ge=0, alias="minimumExperienceYears")
    verified: bool
    active: bool
    visible: bool

    def matching_dict(self) -> dict:
        return self.model_dump(by_alias=True)


class AlumniRequest(APIModel):
    student: StudentSnapshot
    candidates: list[AlumniCandidate] = Field(default_factory=list)


class RecruiterRequest(APIModel):
    student: StudentSnapshot
    opportunities: list[OpportunityCandidate] = Field(default_factory=list)


class ImprovementRequest(APIModel):
    student: StudentSnapshot


class RecommendationResponse(APIModel):
    entity_id: str = Field(alias="entityId")
    type: Literal[
        "ALUMNI_MENTOR",
        "RECRUITER_OPPORTUNITY",
        "SKILL_IMPROVEMENT",
        "PROJECT_IMPROVEMENT",
        "RESUME_IMPROVEMENT",
    ]
    match_score: float = Field(ge=0, le=100, alias="matchScore")
    reasons: list[str] = Field(min_length=1)
    matched_skills: list[str] = Field(alias="matchedSkills")
    missing_skills: list[str] = Field(alias="missingSkills")
    priority: Literal["LOW", "MEDIUM", "HIGH"]
    algorithm_version: str = Field(alias="algorithmVersion")
    generated_at: str = Field(alias="generatedAt")


class RecommendationList(APIModel):
    recommendations: list[RecommendationResponse]


app = FastAPI(title="VidyaLink Recommendation Engine", version=ALGORITHM_VERSION)


def _authorize_internal_call(service_key: str | None) -> None:
    expected_key = os.getenv("AI_SERVICE_API_KEY")
    if expected_key and service_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid AI service credential")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "algorithmVersion": ALGORITHM_VERSION, "mode": "deterministic-rules"}


@app.post("/recommendations/alumni", response_model=RecommendationList)
def alumni_recommendations(request: AlumniRequest, x_ai_service_key: str | None = Header(default=None)) -> dict:
    _authorize_internal_call(x_ai_service_key)
    return {
        "recommendations": match_alumni(
            request.student.matching_dict(),
            [candidate.matching_dict() for candidate in request.candidates],
        )
    }


@app.post("/recommendations/recruiters", response_model=RecommendationList)
def recruiter_recommendations(request: RecruiterRequest, x_ai_service_key: str | None = Header(default=None)) -> dict:
    _authorize_internal_call(x_ai_service_key)
    return {
        "recommendations": match_recruiter_opportunities(
            request.student.matching_dict(),
            [opportunity.matching_dict() for opportunity in request.opportunities],
        )
    }


@app.post("/recommendations/improvements", response_model=RecommendationList)
def improvement_recommendations(request: ImprovementRequest, x_ai_service_key: str | None = Header(default=None)) -> dict:
    _authorize_internal_call(x_ai_service_key)
    return {"recommendations": recommend_improvements(request.student.matching_dict())}
