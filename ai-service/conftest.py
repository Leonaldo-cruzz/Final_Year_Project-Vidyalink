"""Root conftest.py — adds ai-service root to sys.path for module resolution."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
