"""Analytics for factual GitHub metrics supplied by the Node backend."""

from src.models.github import GithubAnalyticsRequest, GithubAnalyticsResponse
from src.utils.scoring import category_for_score, clamp, rounded


def analyze_github(data: GithubAnalyticsRequest) -> GithubAnalyticsResponse:
    factual_metrics = {
        "repository_count": data.repository_count,
        "commit_count": data.commit_count,
        "commit_frequency": data.commit_frequency,
        "recent_commits": data.recent_commits,
        "languages": data.languages,
        "contribution_activity": data.contribution_activity,
        "recent_activity": data.recent_activity,
        "repository_visibility": data.repository_visibility,
        "public_repository_count": data.public_repository_count,
        "project_activity": data.project_activity,
    }
    score_parts: list[float] = []
    supplied_weight = 0
    if data.repository_count is not None:
        score_parts.append(min(data.repository_count, 10) / 10 * 35)
        supplied_weight += 35
    if data.commit_count is not None:
        score_parts.append(min(data.commit_count, 100) / 100 * 25)
        supplied_weight += 25
    recent_commit_count = data.recent_commits if isinstance(data.recent_commits, int) else len(data.recent_commits or [])
    if data.recent_commits is not None:
        score_parts.append(min(recent_commit_count, 50) / 50 * 15)
        supplied_weight += 15
    if data.public_repository_count is not None:
        score_parts.append(min(data.public_repository_count, 10) / 10 * 10)
        supplied_weight += 10
    if data.commit_frequency is not None:
        score_parts.append(min(data.commit_frequency, 20) / 20 * 15)
        supplied_weight += 15
    if data.recent_activity is not None:
        score_parts.append(15.0 if data.recent_activity else 0.0)
        supplied_weight += 15
    if data.contribution_activity is not None:
        score_parts.append(data.contribution_activity * 0.10)
        supplied_weight += 10
    if data.project_activity is not None:
        score_parts.append(data.project_activity * 0.10)
        supplied_weight += 10
    # Normalize by the maximum weight represented by supplied metrics so that
    # absent data is not silently treated as poor activity.
    derived = rounded(sum(score_parts) / supplied_weight * 100) if supplied_weight else 0.0
    explanation = [
        "The derived score is calculated only from the supplied repository and activity metrics.",
        "Commit volume is an activity signal and is not treated as proof of code quality.",
    ]
    limitations = [
        "No GitHub authentication or live GitHub lookup is performed by this service.",
        "Missing metrics reduce available evidence rather than proving low performance.",
    ]
    return GithubAnalyticsResponse(
        factual_metrics=factual_metrics,
        derived_activity_score=clamp(derived),
        observations=explanation,
        derived_score=clamp(derived),
        derived_category=category_for_score(derived),
        explanation=explanation,
        limitations=limitations,
    )
