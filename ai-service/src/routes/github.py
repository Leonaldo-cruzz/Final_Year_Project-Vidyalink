from fastapi import APIRouter

from src.models.github import GithubAnalyticsRequest, GithubAnalyticsResponse
from src.services.github_analytics import analyze_github

router = APIRouter(prefix="/api/v1/github", tags=["github"])


@router.post("/analyze", response_model=GithubAnalyticsResponse)
def analyze_github_route(payload: GithubAnalyticsRequest) -> GithubAnalyticsResponse:
    return analyze_github(payload)

