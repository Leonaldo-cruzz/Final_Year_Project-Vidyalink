"""Tests for the /health endpoint."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_200():
    """Verify that GET /health returns HTTP 200 with healthy status."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["service"] == "vidyalink-ai"
    assert data["status"] == "healthy"

    # Ensure no sensitive details are exposed
    assert "apiKey" not in data
    assert "secret" not in data
    assert "db" not in data
    assert "path" not in data
