from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_github_analytics_separates_facts_and_derived_activity() -> None:
    response = client.post(
        "/api/v1/github/analyze",
        json={
            "repository_count": 4,
            "commit_count": 42,
            "recent_commits": 8,
            "public_repository_count": 3,
            "recent_activity": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["factual_metrics"]["recent_commits"] == 8
    assert 0 <= body["derived_activity_score"] <= 100
    assert body["observations"]

