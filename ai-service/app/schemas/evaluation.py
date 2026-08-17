from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectItem(BaseModel):
    """Schema for a project asset in the evaluation payload."""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200, description="Project title")
    shortDescription: Optional[str] = Field(None, max_length=1000)
    detailedDescription: Optional[str] = Field(None, max_length=10000)
    category: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    githubRepository: Optional[str] = None
    liveDeployment: Optional[str] = None
    isVerified: bool = Field(default=True, description="Whether this project has been faculty-verified")

    model_config = ConfigDict(extra="ignore")


class CertificateItem(BaseModel):
    """Schema for a certificate asset in the evaluation payload."""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200, description="Certificate title")
    issuer: Optional[str] = None
    issueDate: Optional[str] = None
    credentialId: Optional[str] = None
    credentialUrl: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    isVerified: bool = Field(default=True, description="Whether this certificate has been faculty-verified")

    model_config = ConfigDict(extra="ignore")


class GitHubData(BaseModel):
    """Schema for GitHub profile integration data in the evaluation payload."""
    username: Optional[str] = None
    bio: Optional[str] = None
    publicRepos: Optional[int] = 0
    followers: Optional[int] = 0
    following: Optional[int] = 0
    githubProfileUrl: Optional[str] = None
    repositories: List[Dict[str, Any]] = Field(default_factory=list)
    isVerified: bool = Field(default=True, description="Whether GitHub connection has been verified")

    model_config = ConfigDict(extra="ignore")


class PortfolioEvaluationRequest(BaseModel):
    """Input request contract for evaluating a student portfolio."""
    studentId: str = Field(..., min_length=1, max_length=100, description="Student unique ID")
    portfolioId: str = Field(..., min_length=1, max_length=100, description="Portfolio unique ID")
    resumeText: Optional[str] = Field(None, max_length=50000, description="Extracted resume text")
    projects: List[ProjectItem] = Field(default_factory=list, description="Verified student projects")
    certificates: List[CertificateItem] = Field(default_factory=list, description="Verified student certificates")
    github: Optional[GitHubData] = Field(default=None, description="GitHub account metrics")
    skills: List[str] = Field(default_factory=list, description="Aggregated student skill list")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "studentId": "6a82e09cf913116f506cf0d7",
                "portfolioId": "6a82e09ef913116f506cf0e6",
                "resumeText": "Experienced developer with expertise in Node.js, Python, and React.",
                "projects": [
                  {
                    "id": "proj_1",
                    "title": "VidyaLink Platform",
                    "shortDescription": "Student portfolio verification system",
                    "technologies": ["Node.js", "Express", "MongoDB", "React"],
                    "githubRepository": "https://github.com/example/vidyalink",
                    "isVerified": True
                  }
                ],
                "certificates": [
                  {
                    "id": "cert_1",
                    "title": "AWS Certified Cloud Practitioner",
                    "issuer": "Amazon Web Services",
                    "skills": ["AWS", "Cloud"],
                    "isVerified": True
                  }
                ],
                "github": {
                  "username": "studentdev",
                  "publicRepos": 12,
                  "followers": 25,
                  "isVerified": True
                },
                "skills": ["JavaScript", "Python", "React", "Node.js", "MongoDB"]
            }
        }
    )


class EvaluationResultData(BaseModel):
    """Payload representation of an evaluation score result."""
    portfolioScore: Optional[float] = None
    atsScore: Optional[float] = None
    githubScore: Optional[float] = None
    industryReadinessScore: Optional[float] = None
    skills: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    status: str = Field(default="evaluation_pending")


class PortfolioEvaluationResponse(BaseModel):
    """Response contract for portfolio evaluation."""
    success: bool = True
    data: EvaluationResultData


class HealthResponse(BaseModel):
    """Health check response schema."""
    success: bool = True
    service: str = "vidyalink-ai"
    status: str = "healthy"
