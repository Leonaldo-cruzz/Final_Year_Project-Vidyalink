"""Root conftest.py — add ai-service root to sys.path so all `from app...` imports resolve."""

import sys
import os

# Ensure the ai-service root is on sys.path
AI_SERVICE_ROOT = os.path.dirname(os.path.abspath(__file__))
if AI_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, AI_SERVICE_ROOT)
