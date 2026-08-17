def test_health_check_endpoint(client):
    """Test that GET /health returns 200 and healthy status response."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["service"] == "vidyalink-ai"
    assert data["status"] == "healthy"


def test_root_endpoint(client):
    """Test that GET / returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["service"] == "vidyalink-ai"
