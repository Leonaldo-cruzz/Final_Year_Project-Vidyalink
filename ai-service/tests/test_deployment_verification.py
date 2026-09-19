"""Tests for live deployment verification."""

from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.deployment_verification import verify_deployment

client = TestClient(app)


def test_verify_deployment_empty_or_none():
    res = verify_deployment(None)
    assert res.status == "not_provided"

    res_empty = verify_deployment("   ")
    assert res_empty.status == "not_provided"


def test_verify_deployment_invalid_scheme():
    res = verify_deployment("ftp://example.com")
    assert res.status == "failed"
    assert "Invalid deployment URL" in res.message


def test_verify_deployment_malformed():
    res = verify_deployment("not_a_valid_url")
    assert res.status == "failed"


@patch("src.services.deployment_verification.httpx.Client")
def test_verify_deployment_reachable(mock_client_cls):
    mock_instance = MagicMock()
    mock_response = MagicMock(status_code=200)
    mock_instance.head.return_value = mock_response
    mock_client_cls.return_value.__enter__.return_value = mock_instance

    res = verify_deployment("https://example.com/app")
    assert res.status == "reachable"
    assert res.status_code == 200
    assert "live" in res.message.lower()


@patch("src.services.deployment_verification.httpx.Client")
def test_verify_deployment_unreachable_status(mock_client_cls):
    mock_instance = MagicMock()
    mock_response = MagicMock(status_code=503)
    mock_instance.head.return_value = mock_response
    mock_client_cls.return_value.__enter__.return_value = mock_instance

    res = verify_deployment("https://example.com/down")
    assert res.status == "unreachable"
    assert res.status_code == 503


@patch("src.services.deployment_verification.httpx.Client")
def test_verify_deployment_timeout(mock_client_cls):
    mock_instance = MagicMock()
    mock_instance.head.side_effect = httpx.TimeoutException("Timeout")
    mock_instance.get.side_effect = httpx.TimeoutException("Timeout")
    mock_client_cls.return_value.__enter__.return_value = mock_instance

    res = verify_deployment("https://example.com/timeout")
    assert res.status == "unreachable"
    assert "timed out" in res.message


def test_verify_deployment_api_route():
    with patch("src.services.deployment_verification.verify_deployment") as mock_verify:
        from src.models.scoring import DeploymentVerificationResponse

        mock_verify.return_value = DeploymentVerificationResponse(
            url="https://myapp.vercel.app",
            status="reachable",
            status_code=200,
            response_time_ms=120.5,
            message="Live",
        )
        response = client.post(
            "/api/v1/portfolio/verify-deployment",
            json={"url": "https://myapp.vercel.app"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reachable"
        assert data["status_code"] == 200
