"""Internal service authentication for the VIDYALINK AI service.

All business endpoints require the caller to present the shared secret in
the ``X-VIDYALINK-INTERNAL-KEY`` request header.  The comparison is done
in constant time (``hmac.compare_digest``) to eliminate timing side-channels.

The ``/health`` endpoint is intentionally excluded from this check so that
Render health-check probes can reach it without credentials.

Security invariant
------------------
* When ``AI_SERVICE_API_KEY`` is non-empty the dependency enforces the check.
* When the variable is empty AND ``NODE_ENV`` / ``AI_ENV`` is ``production``
  the application refuses to start (see ``src/main.py`` startup validation).
* The secret is NEVER written to log output or included in error responses.
"""

from __future__ import annotations

import hmac
import logging

from fastapi import Depends, Header, HTTPException
from typing import Annotated

from src.config import Settings, get_settings

logger = logging.getLogger("vidyalink-ai-service")

_HEADER_NAME = "x-vidyalink-internal-key"


def _verify_internal_key(
    x_vidyalink_internal_key: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    """FastAPI dependency that validates the shared-secret service key.

    Raises HTTP 401 when the header is absent.
    Raises HTTP 403 when the header is present but incorrect.
    Returns None (no-op) when no key is configured — this only happens
    in local development; production startup validation prevents this case.
    """
    configured_key = settings.ai_service_api_key

    # No key configured → auth is disabled (development / test only).
    # Production startup validation in main.py prevents this path in prod.
    if not configured_key:
        return

    if x_vidyalink_internal_key is None:
        # Do not reveal the expected header value in the response.
        raise HTTPException(status_code=401, detail="Authentication required")

    # Constant-time comparison to prevent timing attacks.
    if not hmac.compare_digest(
        configured_key.encode("utf-8"),
        x_vidyalink_internal_key.encode("utf-8"),
    ):
        raise HTTPException(status_code=403, detail="Invalid service key")


# Re-export as a FastAPI Depends instance for concise route signatures.
require_internal_key = Depends(_verify_internal_key)
