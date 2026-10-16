import pytest

import main
from rate_limit import RateLimiter


@pytest.fixture(autouse=True)
def fresh_limiter(monkeypatch):
    """Each test starts with its own request counts."""
    monkeypatch.setattr(main, "limiter", RateLimiter())
