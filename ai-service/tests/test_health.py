from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json() == {"status": "ok", "service": "vidyalink-ai"}


def test_unknown_endpoint_returns_machine_readable_404() -> None:
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
