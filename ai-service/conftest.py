"""Root conftest.py — adds ai-service root to sys.path for module resolution."""

import sys
import os

# Ensure the ai-service root directory (containing `app/`) is in sys.path
sys.path.insert(0, os.path.dirname(__file__))
