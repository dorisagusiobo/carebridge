import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

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
    visitor = {"cf-connecting-ip": "203.0.113.7"}
    for _ in range(main.PLANS_PER_WINDOW):
        assert client.post("/api/plan", json=body, headers=visitor).status_code == 200
    assert client.post("/api/plan", json=body, headers=visitor).status_code == 429
    other = {"cf-connecting-ip": "198.51.100.2"}
    assert client.post("/api/plan", json=body, headers=other).status_code == 200


def test_a_faked_forwarded_header_does_not_get_around_the_limit(client):
    body = {"instructions": SAMPLES["heart-failure"]["instructions"]}
    for _ in range(main.PLANS_PER_WINDOW):
        client.post("/api/plan", json=body, headers={"cf-connecting-ip": "203.0.113.7"})
    faked = {"cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.99"}
    assert client.post("/api/plan", json=body, headers=faked).status_code == 429


@pytest.mark.parametrize(
    ("headers", "expected"),
    [
        (
            {"cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 9.9.9.9"},
            "203.0.113.7",
        ),
        ({"x-forwarded-for": "6.6.6.6, 203.0.113.7"}, "203.0.113.7"),
        ({"x-forwarded-for": " 203.0.113.7 "}, "203.0.113.7"),
        ({}, "testclient"),
    ],
)
def test_visitor_id_uses_headers_the_visitor_cannot_fake(headers, expected):
    scope = {
        "type": "http",
        "headers": [(k.encode(), v.encode()) for k, v in headers.items()],
        "client": ("testclient", 123),
    }
    assert rate_limit.visitor_id(Request(scope)) == expected


def test_visitor_id_without_client():
    assert (
        rate_limit.visitor_id(Request({"type": "http", "headers": [], "client": None}))
        == "unknown"
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
