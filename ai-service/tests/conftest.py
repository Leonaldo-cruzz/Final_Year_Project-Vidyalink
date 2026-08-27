"""conftest.py — shared pytest configuration and async settings."""

import pytest


def pytest_configure(config):
    """Configure asyncio mode for all tests."""
    config.addinivalue_line("markers", "asyncio: mark test as async")
