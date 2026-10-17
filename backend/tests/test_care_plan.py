import json
import os

import pytest

from care_plan import (
    CarePlan,
    PlanError,
    action_from_instructions,
    build_plan,
    ground_plan,
    is_grounded,
    normalize,
    strict_schema,
)
from samples import SAMPLES

HEART = SAMPLES["heart-failure"]["instructions"]


def plan_dict(**overrides):
    plan = {
        "reason_for_stay": "Your heart failure got worse.",
        "reason_source": "Acute on chronic systolic heart failure",
        "key_points": [
            {
                "text": "Weigh yourself every morning.",
                "source": "Weigh yourself every morning",
            },
            {
                "text": "Take your new water pill each morning.",
                "source": "NEW: Furosemide 40 mg PO once daily in the morning",
            },
        ],
        "medications": [
            {
                "name": "Furosemide",
                "dose": "40 mg",
                "when": "Once a day in the morning",
                "purpose": "Water pill",
                "purpose_source": "(water pill)",
                "change": "new",
                "source": "NEW: Furosemide 40 mg PO once daily in the morning",
            }
        ],
        "appointments": [
            {
                "with_whom": "Cardiology clinic (Dr. Reyes)",
                "when": "In 7 days",
                "purpose": "Heart check",
                "source": "Cardiology clinic (Dr. Reyes) in 7 days",
            }
        ],
        "avoid": [
            {
                "text": "Don't take Advil, Motrin or Aleve.",
                "source": "Do not take NSAIDs",
            }
        ],
        "self_care": [
            {
                "text": "Weigh yourself every morning.",
                "source": "Weigh yourself every morning",
            }
        ],
        "warning_signs": [
            {
                "sign": "Chest pain",
                "instructed_action": "call_911",
                "source": "CALL 911 IF: chest pain",
            }
        ],
        "questions_for_care_team": ["What time is my cardiology appointment?"],
    }
    plan.update(overrides)
    return plan


class FakeModel:
    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    def complete_structured(
        self, messages, schema, *, name, description, max_tokens=4096
    ):
        self.calls.append({"messages": messages, "schema": schema, "name": name})
        return self.reply if isinstance(self.reply, str) else json.dumps(self.reply)


def test_build_plan_returns_grounded_plan():
    model = FakeModel(plan_dict())
    result = build_plan(HEART, model)

    assert result.dropped == []
    assert result.plan.medications[0].name == "Furosemide"
    assert result.plan.warning_signs[0].instructed_action == "call_911"


def test_build_plan_sends_instructions_as_data_with_schema():
    model = FakeModel(plan_dict())
    build_plan(HEART, model)

    call = model.calls[0]
    assert call["name"] == "care_plan"
    assert call["messages"][0]["role"] == "system"
    assert call["messages"][1]["content"].startswith("<instructions>")
    assert "Furosemide" in call["messages"][1]["content"]
    assert call["schema"]["additionalProperties"] is False


def test_items_with_invented_quotes_are_dropped():
    invented = plan_dict(
        medications=[
            {
                "name": "Aspirin",
                "dose": "81 mg",
                "when": "Daily",
                "purpose": "",
                "purpose_source": "",
                "change": "new",
                "source": "Aspirin 81 mg daily",
            }
        ],
        warning_signs=[
            {
                "sign": "Headache",
                "instructed_action": "call_911",
                "source": "CALL 911 IF: headache",
            }
        ],
    )
    result = build_plan(HEART, FakeModel(invented))

    assert result.plan.medications == []
    assert result.plan.warning_signs == []
    assert result.dropped == [
        "medication: Aspirin 81 mg daily",
        "warning sign: CALL 911 IF: headache",
    ]
    # Items with real quotes survive.
    assert len(result.plan.appointments) == 1


def test_grounding_ignores_case_spacing_and_curly_quotes():
    text = "Don’t   lift more than 10 lbs.\nCall 911 if chest pain."
    plan = CarePlan.model_validate(
        plan_dict(
            reason_for_stay="",
            reason_source="",
            key_points=[],
            medications=[],
            appointments=[],
            avoid=[
                {"text": "No heavy lifting.", "source": "don't lift MORE than 10 lbs"}
            ],
            self_care=[],
            warning_signs=[
                {
                    "sign": "Chest pain",
                    "instructed_action": "call_911",
                    "source": "Call 911 if chest pain.",
                }
            ],
        )
    )
    result = ground_plan(plan, text)

    assert result.dropped == []
    assert len(result.plan.avoid) == 1


@pytest.mark.parametrize(
    ("quote", "expected"),
    [
        ("Seek care for: confusion", True),
        ("Seek care for... lips turning blue", True),
        ("Seek care for: chest pain", False),
        ("care: no", False),
        ("Seek care for: confusion; fever returns", True),
    ],
)
def test_quotes_joining_a_heading_to_an_item_count_when_each_part_is_present(
    quote, expected
):
    text = (
        "Seek care for: fever returns, worsening cough, confusion, lips turning blue."
    )
    assert is_grounded(quote, normalize(text)) is expected


def test_normalize_collapses_whitespace_and_dashes():
    assert normalize("  Twice–daily\n\n DOSE. ") == "twice-daily dose"


@pytest.mark.parametrize("instructions", ["too short", "x" * 12_001])
def test_build_plan_rejects_bad_lengths(instructions):
    with pytest.raises(ValueError):
        build_plan(instructions, FakeModel(plan_dict()))


@pytest.mark.parametrize(
    "reply",
    [
        "not json",
        json.dumps({"summary": "missing everything else"}),
        json.dumps(plan_dict(medications=[{"name": "X"}])),
        json.dumps(plan_dict(extra_field="nope")),
    ],
)
def test_build_plan_rejects_malformed_replies(reply):
    with pytest.raises(PlanError):
        build_plan(HEART, FakeModel(reply))


def test_strict_schema_requires_every_property_and_inlines_refs():
    schema = strict_schema(CarePlan)

    assert "$defs" not in json.dumps(schema)
    assert set(schema["required"]) == set(schema["properties"])
    medication = schema["properties"]["medications"]["items"]
    assert medication["additionalProperties"] is False
    assert set(medication["required"]) == {
        "name",
        "dose",
        "when",
        "purpose",
        "purpose_source",
        "change",
        "source",
    }
    assert medication["properties"]["change"]["enum"] == [
        "new",
        "changed",
        "continue",
        "stop",
        "not_stated",
    ]


@pytest.mark.live
@pytest.mark.skipif(
    not os.getenv("OPENROUTER_API_KEY"), reason="needs OPENROUTER_API_KEY"
)
@pytest.mark.parametrize("sample", list(SAMPLES))
def test_live_samples_produce_grounded_plans(sample):
    from openrouter_client import OpenRouterClient

    instructions = SAMPLES[sample]["instructions"]
    result = build_plan(instructions, OpenRouterClient())
    plan = result.plan

    assert plan.medications, "every sample lists medicines"
    assert plan.warning_signs, "every sample lists warning signs"
    for med in plan.medications:
        assert normalize(med.source) in normalize(instructions)


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("dizziness", "call_care_team"),
        (
            "CALL YOUR DOCTOR IF: weight gain of more than 2 lbs in one day",
            "call_care_team",
        ),
        ("fainting", "call_911"),
        ("CALL 911 IF: chest pain", "call_911"),
    ],
)
def test_warning_sign_action_comes_from_the_instructions(source, expected):
    assert action_from_instructions(source, HEART) == expected


def test_warning_sign_action_reads_er_and_seek_care_cues():
    surgery = SAMPLES["appendectomy"]["instructions"]
    pneumonia = SAMPLES["pneumonia"]["instructions"]
    assert action_from_instructions("fever over 101.5 F", surgery) == "go_to_er"
    assert action_from_instructions("lips turning blue", pneumonia) == "call_care_team"


def test_warning_sign_action_is_none_without_a_cue():
    assert action_from_instructions("Walk as tolerated", HEART) is None
    assert action_from_instructions("not in the text", HEART) is None


def test_model_label_is_overridden_by_the_instructions():
    mislabeled = plan_dict(
        warning_signs=[
            {
                "sign": "Dizziness",
                "instructed_action": "call_911",
                "source": "dizziness",
            },
            {
                "sign": "Walk",
                "instructed_action": "not_stated",
                "source": "Walk as tolerated",
            },
        ]
    )
    result = build_plan(HEART, FakeModel(mislabeled))

    actions = [sign.instructed_action for sign in result.plan.warning_signs]
    assert actions == ["call_care_team", "not_stated"]


class SequenceModel(FakeModel):
    def __init__(self, replies):
        super().__init__(None)
        self.replies = list(replies)

    def complete_structured(self, messages, schema, **kwargs):
        self.calls.append(messages)
        reply = self.replies.pop(0)
        return reply if isinstance(reply, str) else json.dumps(reply)


def test_a_malformed_reply_is_retried_once():
    model = SequenceModel(["not json", plan_dict()])
    result = build_plan(HEART, model)

    assert len(model.calls) == 2
    assert result.plan.medications[0].name == "Furosemide"


def test_two_malformed_replies_raise():
    model = SequenceModel(["not json", "still not json"])
    with pytest.raises(PlanError):
        build_plan(HEART, model)
    assert len(model.calls) == 2


@pytest.mark.parametrize("purpose_source", ["", "Helps your heart"])
def test_purposes_the_instructions_dont_state_are_cleared(purpose_source):
    med = plan_dict()["medications"][0] | {
        "name": "Lisinopril",
        "purpose": "Helps your heart",
        "purpose_source": purpose_source,
        "source": "CONTINUE: Lisinopril 10 mg PO daily",
    }
    result = build_plan(HEART, FakeModel(plan_dict(medications=[med])))

    assert result.plan.medications[0].purpose == ""


def test_stated_purposes_are_kept():
    result = build_plan(HEART, FakeModel(plan_dict()))
    assert result.plan.medications[0].purpose == "Water pill"


def test_red_flags_raise_under_stated_warning_signs():
    pneumonia = SAMPLES["pneumonia"]["instructions"]
    signs = [
        {
            "sign": "Lips turn blue",
            "instructed_action": "call_care_team",
            "source": "lips turning blue",
        },
        {
            "sign": "Fever comes back",
            "instructed_action": "call_care_team",
            "source": "fever returns",
        },
    ]
    result = build_plan(
        pneumonia,
        FakeModel(
            plan_dict(
                medications=[],
                appointments=[],
                avoid=[],
                self_care=[],
                warning_signs=signs,
            )
        ),
    )

    lips, fever = result.plan.warning_signs
    assert (lips.instructed_action, lips.action, lips.red_flag) == (
        "call_care_team",
        "call_911",
        "blue or grey skin",
    )
    assert (fever.action, fever.red_flag) == ("call_care_team", "")


def test_a_grounded_reason_and_key_points_are_kept():
    result = build_plan(HEART, FakeModel(plan_dict()))

    assert result.plan.reason_for_stay == "Your heart failure got worse."
    assert result.plan.reason_source == "Acute on chronic systolic heart failure"
    assert [point.text for point in result.plan.key_points] == [
        "Weigh yourself every morning.",
        "Take your new water pill each morning.",
    ]
    assert result.dropped == []


@pytest.mark.parametrize(
    "reason_source",
    ["", "Germs got into your lungs and made them sore"],
)
def test_a_reason_without_a_real_quote_is_hidden(reason_source):
    pneumonia = SAMPLES["pneumonia"]["instructions"]
    plan = plan_dict(
        reason_for_stay="Germs got into your lungs and made them sore and full of fluid.",
        reason_source=reason_source,
        key_points=[],
        medications=[],
        appointments=[],
        avoid=[],
        self_care=[],
        warning_signs=[],
    )
    result = build_plan(pneumonia, FakeModel(plan))

    assert result.plan.reason_for_stay == ""
    assert result.plan.reason_source == ""
    assert result.dropped[0].startswith("reason for stay:")


def test_an_empty_reason_is_fine():
    plan = plan_dict(reason_for_stay="", reason_source="")
    result = build_plan(HEART, FakeModel(plan))
    assert result.plan.reason_for_stay == ""
    assert result.dropped == []


def test_key_points_without_a_real_quote_are_dropped():
    plan = plan_dict(
        key_points=[
            {
                "text": "Weigh yourself every morning.",
                "source": "Weigh yourself every morning",
            },
            {"text": "Drink lots of water.", "source": "Drink 3 liters of water"},
        ]
    )
    result = build_plan(HEART, FakeModel(plan))

    assert [point.text for point in result.plan.key_points] == [
        "Weigh yourself every morning."
    ]
    assert result.dropped == ["key point: Drink 3 liters of water"]
