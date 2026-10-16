import pytest
from fastapi.testclient import TestClient

import main
from openrouter_client import OpenRouterRequestError
from samples import SAMPLES
from tests.test_care_plan import FakeModel, plan_dict

HEART = SAMPLES["heart-failure"]["instructions"]


class FailingModel:
    def __init__(self, error):
        self.error = error

    def complete_structured(self, *args, **kwargs):
        raise self.error


@pytest.fixture
def client():
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def use_model(model):
    main.app.dependency_overrides[main.get_model] = lambda: model


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_samples_are_listed(client):
    samples = client.get("/api/samples").json()
    assert {s["id"] for s in samples} == set(SAMPLES)
    assert all(s["instructions"] for s in samples)


def test_plan_returns_grounded_plan(client):
    use_model(FakeModel(plan_dict()))
    response = client.post("/api/plan", json={"instructions": HEART})

    assert response.status_code == 200
    body = response.json()
    assert body["plan"]["medications"][0]["name"] == "Furosemide"
    assert body["dropped"] == []


@pytest.mark.parametrize(
    "payload",
    [
        {"instructions": "short"},
        {"instructions": "x" * 12_001},
        {},
        {"instructions": HEART, "extra": 1},
    ],
)
def test_plan_rejects_bad_requests(client, payload):
    use_model(FakeModel(plan_dict()))
    assert client.post("/api/plan", json=payload).status_code == 422


def test_plan_reports_ai_failures(client):
    use_model(FailingModel(OpenRouterRequestError("timeout")))
    response = client.post("/api/plan", json={"instructions": HEART})

    assert response.status_code == 502
    assert "try again" in response.json()["detail"]


def test_plan_reports_malformed_plans(client):
    use_model(FakeModel("not json"))
    response = client.post("/api/plan", json={"instructions": HEART})

    assert response.status_code == 502
    assert "incomplete" in response.json()["detail"]


def test_plan_without_api_key_is_503(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    response = client.post("/api/plan", json={"instructions": HEART})

    assert response.status_code == 503
