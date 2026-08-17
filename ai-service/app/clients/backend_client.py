import logging
from typing import Any, Dict, Optional
import httpx

from app.config import settings

logger = logging.getLogger("vidyalink.ai.backend_client")


class BackendClient:
    """HTTP client for communicating with VidyaLink Node/Express backend."""

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        self.base_url = (base_url or settings.BACKEND_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.REQUEST_TIMEOUT_SECONDS

    async def get_student_verification_summary(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Fetch verification summary for a student from the backend."""
        url = f"{self.base_url}/verification/student/{student_id}/summary"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            logger.warning("Failed to fetch verification summary for %s: %s", student_id, str(exc))
            return None


backend_client = BackendClient()
