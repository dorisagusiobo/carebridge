import json
import os

import pytest
from fastapi.testclient import TestClient

import main
from care_plan import PlanError
from openrouter_client import OpenRouterRequestError
from translate import TranslateRequest, is_faithful, translate


class FakeModel:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = []

    def complete_structured(self, messages, schema, **kwargs):
        self.calls.append(messages)
        reply = self.replies.pop(0)
        return reply if isinstance(reply, str) else json.dumps({"translations": reply})


def request(*texts, language="es"):
    return TranslateRequest(language=language, texts=list(texts))


def test_translates_in_order():
    model = FakeModel(["Toma 40 mg cada mañana", "Llama al 911"])
    result = translate(request("Take 40 mg every morning", "Call 911"), model)

    assert result.texts == ["Toma 40 mg cada mañana", "Llama al 911"]
    assert result.kept_english == []
    system, user = model.calls[0]
    assert "Spanish" in system["content"]
    assert json.loads(user["content"]) == ["Take 40 mg every morning", "Call 911"]


def test_a_changed_number_keeps_the_english():
    model = FakeModel(["Toma 4 mg cada mañana", "Llama al 911"])
    result = translate(request("Take 40 mg every morning", "Call 911"), model)

    assert result.texts == ["Take 40 mg every morning", "Llama al 911"]
    assert result.kept_english == [0]


@pytest.mark.parametrize(
    ("english", "translated", "ok"),
    [
        (
            "Keep sodium under 2,000 mg",
            "Mantenga el sodio por debajo de 2.000 mg",
            True,
        ),
        ("Keep sodium under 2,000 mg", "Gardez le sodium sous 2 000 mg", True),
        ("Call 555-0142", "اتصل بالرقم ٥٥٥-٠١٤٢", True),
        ("In 1 to 2 weeks", "En 1 a 2 semanas", True),
        ("In 2 weeks", "En dos semanas", False),
        ("We left out {count} items", "Omitimos {count} elementos", True),
        ("We left out {count} items", "Omitimos algunos elementos", False),
        ("Rest.", "", False),
        ("", "", True),
    ],
)
def test_faithfulness_checks_numbers_and_placeholders(english, translated, ok):
    assert is_faithful(english, translated) is ok


def test_a_wrong_count_is_retried_then_rejected():
    model = FakeModel(["solo una"], "not json")
    with pytest.raises(PlanError):
        translate(request("one", "two"), model)
    assert len(model.calls) == 2


def test_a_wrong_count_can_recover_on_retry():
    model = FakeModel(["solo una"], ["uno", "dos"])
    assert translate(request("one", "two"), model).texts == ["uno", "dos"]


def test_too_much_text_is_rejected():
    with pytest.raises(ValueError):
        translate(request(*["x" * 1000] * 31), FakeModel())


@pytest.fixture
def client():
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def use(model):
    main.app.dependency_overrides[main.get_model] = lambda: model


def test_languages_endpoint(client):
    codes = [lang["code"] for lang in client.get("/api/languages").json()]
    assert codes[:3] == ["es", "zh-Hans", "vi"]
    assert "ar" in codes


def test_translate_endpoint(client):
    use(FakeModel(["Descanse."]))
    response = client.post(
        "/api/translate", json={"language": "es", "texts": ["Rest."]}
    )
    assert response.json() == {"texts": ["Descanse."], "kept_english": []}


@pytest.mark.parametrize(
    "payload",
    [
        {"language": "klingon", "texts": ["Rest."]},
        {"language": "es", "texts": []},
        {"language": "es", "texts": ["x" * 1001]},
        {"language": "es", "texts": ["Rest."], "extra": 1},
    ],
)
def test_translate_endpoint_rejects_bad_requests(client, payload):
    use(FakeModel())
    assert client.post("/api/translate", json=payload).status_code == 422


@pytest.mark.parametrize(
    ("model", "status"),
    [
        (FakeModel(["a"], ["b"]), 502),
        (
            type(
                "Down",
                (),
                {
                    "complete_structured": lambda *a, **k: (_ for _ in ()).throw(
                        OpenRouterRequestError("x")
                    )
                },
            )(),
            502,
        ),
    ],
)
def test_translate_endpoint_reports_failures(client, model, status):
    use(model)
    response = client.post(
        "/api/translate", json={"language": "es", "texts": ["one", "two"]}
    )
    assert response.status_code == status


def test_translate_endpoint_rejects_too_much_text(client):
    use(FakeModel())
    response = client.post(
        "/api/translate", json={"language": "es", "texts": ["x" * 1000] * 31}
    )
    assert response.status_code == 413


@pytest.mark.live
@pytest.mark.skipif(
    not os.getenv("OPENROUTER_API_KEY"), reason="needs OPENROUTER_API_KEY"
)
@pytest.mark.parametrize("language", ["es", "zh-Hans", "ar"])
def test_live_translation_keeps_numbers(language):
    from openrouter_client import OpenRouterClient

    texts = [
        "Take 40 mg once a day in the morning.",
        "Call 911 right away if you have",
        "In 1 to 2 weeks",
        "We left out {count} items.",
    ]
    result = translate(
        TranslateRequest(language=language, texts=texts), OpenRouterClient()
    )
    assert len(result.texts) == len(texts)
    assert result.kept_english == []


@pytest.fixture(autouse=True)
def empty_cache():
    import translate as module

    module._cache.clear()
    yield
    module._cache.clear()


def test_cacheable_text_is_only_translated_once():
    first = FakeModel(["Su plan", "Imprimir"])
    translate(
        TranslateRequest(language="es", texts=["Your plan", "Print"], cacheable=True),
        first,
    )

    second = FakeModel(["Copiar"])
    result = translate(
        TranslateRequest(
            language="es", texts=["Your plan", "Copy", "Print"], cacheable=True
        ),
        second,
    )

    assert result.texts == ["Su plan", "Copiar", "Imprimir"]
    assert json.loads(second.calls[0][1]["content"]) == ["Copy"]


def test_plan_text_is_never_cached():
    translate(
        request("Take 40 mg every morning"), FakeModel(["Toma 40 mg cada mañana"])
    )
    model = FakeModel(["Toma 40 mg cada mañana"])
    translate(request("Take 40 mg every morning"), model)
    assert len(model.calls) == 1


def test_repeated_strings_are_sent_once():
    model = FakeModel(["Descanse."])
    result = translate(request("Rest.", "Rest."), model)
    assert result.texts == ["Descanse.", "Descanse."]
    assert json.loads(model.calls[0][1]["content"]) == ["Rest."]


def test_unfaithful_text_is_not_cached():
    translate(
        TranslateRequest(language="es", texts=["In 2 weeks"], cacheable=True),
        FakeModel(["En dos semanas"]),
    )
    model = FakeModel(["En 2 semanas"])
    result = translate(
        TranslateRequest(language="es", texts=["In 2 weeks"], cacheable=True), model
    )
    assert result.texts == ["En 2 semanas"]
    assert len(model.calls) == 1


def test_the_cache_is_bounded(monkeypatch):
    import translate as module

    monkeypatch.setattr(module, "CACHE_SIZE", 2)
    texts = ["one", "two", "three"]
    translate(
        TranslateRequest(language="es", texts=texts, cacheable=True),
        FakeModel(["uno", "dos", "tres"]),
    )
    assert list(module._cache) == [("es", "two"), ("es", "three")]


def test_fully_cached_text_makes_no_model_call():
    translate(
        TranslateRequest(language="es", texts=["Print"], cacheable=True),
        FakeModel(["Imprimir"]),
    )
    model = FakeModel()
    result = translate(
        TranslateRequest(language="es", texts=["Print"], cacheable=True), model
    )
    assert result.texts == ["Imprimir"]
    assert model.calls == []
