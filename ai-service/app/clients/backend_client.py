"""HTTP client for communicating with the main VidyaLink Node.js backend."""

import logging
from typing import Any, Dict, Optional
import httpx
from app.config import settings

logger = logging.getLogger("ai_service.backend_client")


class BackendClient:
    """Async HTTP client for Node backend communication."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 10.0):
        self.base_url = (base_url or settings.BACKEND_BASE_URL).rstrip("/")
        self.timeout = timeout

    async def get_health(self) -> Dict[str, Any]:
        """Check the health of the Node.js backend service."""
        url = f"{self.base_url}/api/v1/health"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as exc:
            logger.error("Failed to connect to backend service: %s", type(exc).__name__)
            raise RuntimeError("Backend service is currently unreachable") from exc
        except httpx.HTTPStatusError as exc:
            logger.error("Backend returned error status code: %d", exc.response.status_code)
            raise RuntimeError("Backend service returned an error") from exc
