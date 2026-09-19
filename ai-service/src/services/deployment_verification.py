"""Live deployment verification service."""

from __future__ import annotations

import time
from urllib.parse import urlparse

import httpx

from src.models.scoring import DeploymentVerificationResponse


def verify_deployment(url: str | None) -> DeploymentVerificationResponse:
    """Synchronously verify whether a project's live deployment URL is reachable."""
    clean_url = (url or "").strip()
    if not clean_url:
        return DeploymentVerificationResponse(
            url="",
            status="not_provided",
            message="No deployment URL was provided.",
        )

    try:
        parsed = urlparse(clean_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return DeploymentVerificationResponse(
                url=clean_url,
                status="failed",
                message="Invalid deployment URL scheme or domain. Only HTTP and HTTPS are supported.",
            )
    except Exception as exc:
        return DeploymentVerificationResponse(
            url=clean_url,
            status="failed",
            message=f"Malformed URL: {exc}",
        )

    start = time.perf_counter()
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            try:
                response = client.head(clean_url)
                # Some servers return 405 Method Not Allowed for HEAD; fall back to GET
                if response.status_code == 405:
                    response = client.get(clean_url)
            except httpx.HTTPError:
                response = client.get(clean_url)

            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            status_code = response.status_code

            if status_code < 400:
                status = "reachable"
                message = f"Deployment is live and returned HTTP {status_code}."
            else:
                status = "unreachable"
                message = f"Deployment responded with HTTP error status {status_code}."

            return DeploymentVerificationResponse(
                url=clean_url,
                status=status,
                status_code=status_code,
                response_time_ms=elapsed_ms,
                message=message,
            )
    except httpx.TimeoutException:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return DeploymentVerificationResponse(
            url=clean_url,
            status="unreachable",
            response_time_ms=elapsed_ms,
            message="Deployment verification timed out after 8 seconds.",
        )
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return DeploymentVerificationResponse(
            url=clean_url,
            status="failed",
            response_time_ms=elapsed_ms,
            message=f"Network reachability check failed: {exc}",
        )
