import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
import rate_limit
from rate_limit import RateLimiter
from samples import SAMPLES
from tests.test_care_plan import FakeModel, plan_dict


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_visitors_are_limited_within_the_window():
    clock = Clock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.check("a", "plan", 3)
    with pytest.raises(HTTPException) as error:
        limiter.check("a", "plan", 3)
    assert error.value.status_code == 429

    # Other visitors and other buckets are counted separately.
    limiter.check("b", "plan", 3)
    limiter.check("a", "translate", 3)

    clock.now += rate_limit.WINDOW_SECONDS
    limiter.check("a", "plan", 3)


def test_the_daily_limit_covers_everyone_and_resets(monkeypatch):
    monkeypatch.setattr(rate_limit, "DAILY_LIMIT", 2)
    clock = Clock()
    limiter = RateLimiter(clock)
    limiter.check("a", "plan", 10)
    limiter.check("b", "plan", 10)
    with pytest.raises(HTTPException) as error:
        limiter.check("c", "plan", 10)
    assert "today's limit" in error.value.detail

    clock.now += rate_limit.DAY_SECONDS
    limiter.check("c", "plan", 10)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "limiter", RateLimiter())
    main.app.dependency_overrides[main.get_model] = lambda: FakeModel(plan_dict())
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_plan_requests_are_limited_per_visitor(client):
    body = {"instructions": SAMPLES["heart-failure"]["instructions"]}
    headers = {"x-forwarded-for": "203.0.113.7, 10.0.0.1"}
    for _ in range(main.PLANS_PER_WINDOW):
        assert client.post("/api/plan", json=body, headers=headers).status_code == 200
    assert client.post("/api/plan", json=body, headers=headers).status_code == 429
    assert (
        client.post(
            "/api/plan", json=body, headers={"x-forwarded-for": "198.51.100.2"}
        ).status_code
        == 200
    )


def test_translation_requests_are_limited(client, monkeypatch):
    monkeypatch.setattr(main, "TRANSLATIONS_PER_WINDOW", 1)
    main.app.dependency_overrides[main.get_model] = lambda: type(
        "M",
        (),
        {"complete_structured": lambda *a, **k: '{"translations": ["Descanse."]}'},
    )()
    body = {"language": "es", "texts": ["Rest."]}
    assert client.post("/api/translate", json=body).status_code == 200
    assert client.post("/api/translate", json=body).status_code == 429


def test_security_headers_and_no_caching_for_api(client):
    response = client.get("/api/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"


def test_api_docs_are_not_public(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
