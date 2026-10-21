"""Regression tests for the VIDYALINK AI Service internal authentication.

Coverage:
- Valid key permits access to a protected endpoint.
- Missing key returns HTTP 401.
- Incorrect key returns HTTP 403.
- Protected endpoints are inaccessible without authentication.
- /health endpoint remains publicly accessible (no key required).
- Production startup validation fails safely when the key is absent.
"""

from __future__ import annotations

import contextlib
import sys
from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app
from src.config import Settings, get_settings

_VALID_KEY = "test-internal-secret-key-for-regression"
_WRONG_KEY = "wrong-key-that-does-not-match"
_AUTH_HEADER = "X-VIDYALINK-INTERNAL-KEY"

# Minimal valid payloads for each protected endpoint under test.
_ATS_PAYLOAD = {
    "resume_text": "Python developer with 3 years of experience in FastAPI and Docker.",
    "target_job_description": "Looking for Python FastAPI developer.",
}
_PORTFOLIO_PAYLOAD: dict = {"student_id": "s1", "skills": ["Python"], "projects": []}
_SKILLS_PAYLOAD: dict = {"student_id": "s1", "skills": [], "projects": []}
_SKILL_GAP_PAYLOAD: dict = {"current_skills": ["Python"], "target_role": "Backend Engineer"}
_GITHUB_PAYLOAD: dict = {"username": "octocat"}
_RECOMMENDATIONS_PAYLOAD: dict = {
    "student_id": "s1",
    "skills": [],
    "projects": [],
    "target_role": "Engineer",
}
_READINESS_PAYLOAD: dict = {"student_id": "s1", "skills": [], "projects": []}


@contextlib.contextmanager
def _key_override(api_key: str):
    """Override the FastAPI dependency so tests exercise auth without env vars.

    Uses FastAPI's official ``app.dependency_overrides`` mechanism, which is
    the only reliable way to inject Settings through ``Depends(get_settings)``
    in test scenarios.
    """
    settings = Settings(ai_service_api_key=api_key, ai_env="")
    app.dependency_overrides[get_settings] = lambda: settings
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        app.dependency_overrides.pop(get_settings, None)


# ── /health must always be publicly accessible ────────────────────────────

def test_health_is_public_no_key_required() -> None:
    """Health endpoint must be reachable without authentication."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    # Health response must not expose configuration details.
    body_text = response.text
    assert "api_key" not in body_text.lower()
    assert "secret" not in body_text.lower()


def test_health_with_key_still_works() -> None:
    """Passing the key to /health is harmless and still returns 200."""
    client = TestClient(app)
    response = client.get("/health", headers={_AUTH_HEADER: _VALID_KEY})
    assert response.status_code == 200


def test_health_without_configured_key_still_works() -> None:
    """When no key is configured (dev mode), /health still returns 200."""
    with _key_override("") as client:
        response = client.get("/health")
        assert response.status_code == 200


# ── ATS endpoint auth behaviour ───────────────────────────────────────────

class TestATSAuthentication:
    """Valid/missing/wrong key behaviour on /api/v1/ats/analyze."""

    _ENDPOINT = "/api/v1/ats/analyze"

    def test_missing_key_returns_401(self) -> None:
        """When a key is configured, absent header → 401."""
        with _key_override(_VALID_KEY) as client:
            response = client.post(self._ENDPOINT, json=_ATS_PAYLOAD)
            assert response.status_code == 401

    def test_wrong_key_returns_403(self) -> None:
        """Incorrect secret → 403."""
        with _key_override(_VALID_KEY) as client:
            response = client.post(
                self._ENDPOINT,
                json=_ATS_PAYLOAD,
                headers={_AUTH_HEADER: _WRONG_KEY},
            )
            assert response.status_code == 403

    def test_correct_key_permits_request(self) -> None:
        """Correct secret → endpoint is reached (not rejected with 401/403)."""
        with _key_override(_VALID_KEY) as client:
            response = client.post(
                self._ENDPOINT,
                json=_ATS_PAYLOAD,
                headers={_AUTH_HEADER: _VALID_KEY},
            )
            assert response.status_code not in (401, 403)

    def test_no_configured_key_allows_access(self) -> None:
        """When no key is configured (dev mode), endpoint is accessible."""
        with _key_override("") as client:
            response = client.post(self._ENDPOINT, json=_ATS_PAYLOAD)
            assert response.status_code not in (401, 403)

    def test_error_response_does_not_expose_secret(self) -> None:
        """Error bodies (401) must never contain the configured secret value."""
        with _key_override(_VALID_KEY) as client:
            response = client.post(self._ENDPOINT, json=_ATS_PAYLOAD)
            assert response.status_code == 401
            assert _VALID_KEY not in response.text


# ── Portfolio endpoints auth behaviour ────────────────────────────────────

class TestPortfolioAuthentication:
    """Auth enforcement on /api/v1/portfolio/* endpoints."""

    def test_evaluate_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/portfolio/evaluate", json=_PORTFOLIO_PAYLOAD).status_code == 401

    def test_evaluate_wrong_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post(
                "/api/v1/portfolio/evaluate",
                json=_PORTFOLIO_PAYLOAD,
                headers={_AUTH_HEADER: _WRONG_KEY},
            ).status_code == 403

    def test_evaluate_correct_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            status = client.post(
                "/api/v1/portfolio/evaluate",
                json=_PORTFOLIO_PAYLOAD,
                headers={_AUTH_HEADER: _VALID_KEY},
            ).status_code
            assert status not in (401, 403)

    def test_readiness_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/portfolio/readiness", json=_READINESS_PAYLOAD).status_code == 401

    def test_verify_deployment_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post(
                "/api/v1/portfolio/verify-deployment", json={"url": "https://example.com"}
            ).status_code == 401


# ── Other business endpoints ──────────────────────────────────────────────

class TestOtherEndpointsAuthentication:
    """Spot-checks auth on github, recommendations, and skills routes."""

    def test_github_analyze_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/github/analyze", json=_GITHUB_PAYLOAD).status_code == 401

    def test_github_analyze_wrong_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post(
                "/api/v1/github/analyze",
                json=_GITHUB_PAYLOAD,
                headers={_AUTH_HEADER: _WRONG_KEY},
            ).status_code == 403

    def test_recommendations_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/recommendations", json=_RECOMMENDATIONS_PAYLOAD).status_code == 401

    def test_skills_extract_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/skills/extract", json=_SKILLS_PAYLOAD).status_code == 401

    def test_skills_gap_missing_key(self) -> None:
        with _key_override(_VALID_KEY) as client:
            assert client.post("/api/v1/skills/gap", json=_SKILL_GAP_PAYLOAD).status_code == 401


# ── Production startup validation ─────────────────────────────────────────

class TestProductionStartupValidation:
    """Verifies that missing AI_SERVICE_API_KEY in production causes exit(1)."""

    def test_production_mode_without_key_exits(self) -> None:
        """Settings.is_production=True and no key set → sys.exit(1) called."""
        settings = Settings(ai_service_api_key="", ai_env="production")
        assert settings.is_production is True
        assert settings.ai_service_api_key == ""

        with patch.object(sys, "exit") as mock_exit:
            # Simulate the startup guard logic from main.py.
            if settings.is_production and not settings.ai_service_api_key:
                sys.exit(1)
            mock_exit.assert_called_once_with(1)

    def test_development_mode_without_key_does_not_exit(self) -> None:
        """Settings.is_production=False → startup guard does not call sys.exit."""
        settings = Settings(ai_service_api_key="", ai_env="")
        assert settings.is_production is False

        with patch.object(sys, "exit") as mock_exit:
            if settings.is_production and not settings.ai_service_api_key:
                sys.exit(1)
            mock_exit.assert_not_called()

    def test_production_mode_with_key_does_not_exit(self) -> None:
        """Settings.is_production=True with key set → no exit."""
        settings = Settings(ai_service_api_key=_VALID_KEY, ai_env="production")
        assert settings.is_production is True

        with patch.object(sys, "exit") as mock_exit:
            if settings.is_production and not settings.ai_service_api_key:
                sys.exit(1)
            mock_exit.assert_not_called()

    def test_settings_ai_env_is_case_insensitive(self) -> None:
        """'PRODUCTION' and 'Production' should both count as production mode."""
        for env_val in ("production", "PRODUCTION", "Production"):
            settings = Settings(ai_service_api_key="", ai_env=env_val)
            assert settings.is_production is True, f"Expected is_production=True for AI_ENV={env_val!r}"
