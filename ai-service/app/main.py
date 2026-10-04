"""FastAPI application entrypoint for the VIDYALINK AI Service."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the root of ai-service is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.main import app

__all__ = ["app"]
