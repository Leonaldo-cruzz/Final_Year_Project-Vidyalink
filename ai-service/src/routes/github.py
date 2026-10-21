from fastapi import APIRouter

from src.middleware.internal_auth import require_internal_key
from src.models.github import GithubAnalyticsRequest, GithubAnalyticsResponse
from src.services.github_analytics import analyze_github

router = APIRouter(prefix="/api/v1/github", tags=["github"])


@router.post("/analyze", response_model=GithubAnalyticsResponse, dependencies=[require_internal_key])
def analyze_github_route(payload: GithubAnalyticsRequest) -> GithubAnalyticsResponse:
    return analyze_github(payload)

