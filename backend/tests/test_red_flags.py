import pytest

from red_flags import ACTION_RANK, RED_FLAGS, escalate, match


@pytest.mark.parametrize(
    ("text", "flag"),
    [
        ("Trouble breathing", "breathing problems"),
        ("difficulty breathing", "breathing problems"),
        ("severe shortness of breath", "breathing problems"),
        ("wheeze/SOB", "breathing problems"),
        ("You can't catch your breath", "breathing problems"),
        ("chest pain", "chest pain"),
        ("Chest pressure or tightness", "chest pain"),
        ("fainting", "fainting"),
        ("passed out", "fainting"),
        ("loss of consciousness", "fainting"),
        ("confusion", "change in mental status"),
        ("New confusion or hard to wake", "change in mental status"),
        ("lips turning blue", "blue or grey skin"),
        ("Blue or grey lips or face", "blue or grey skin"),
        ("coughing up blood", "coughing up or vomiting blood"),
        ("vomiting blood", "coughing up or vomiting blood"),
        ("bleeding that will not stop", "bleeding that won't stop"),
        ("swelling of the face or tongue", "swelling of the face or tongue"),
        ("throat swelling", "swelling of the face or tongue"),
        ("slurred speech", "trouble speaking"),
        ("a seizure", "seizure"),
        ("severe abdominal pain", "severe belly pain"),
        (
            "vomiting and unable to keep fluids down",
            "severe or persistent vomiting or diarrhea",
        ),
        ("persistent diarrhea", "severe or persistent vomiting or diarrhea"),
        ("sudden, severe pain anywhere", "sudden severe pain"),
        ("sudden weakness on one side", "sudden dizziness, weakness or vision change"),
    ],
)
def test_emergency_signs_are_recognized(text, flag):
    found = match(text)
    assert found is not None and found.name == flag


@pytest.mark.parametrize(
    "text",
    [
        "dizziness",
        "fever returns",
        "worsening cough",
        "increased swelling in legs or ankles",
        "weight gain of more than 2 lbs in one day",
        "redness or pus at incision sites",
        "worsening abdominal pain",
        "Use incentive spirometer for deep breathing",
        "blue inhaler",
    ],
)
def test_ordinary_warning_signs_are_left_alone(text):
    assert match(text) is None


def test_the_most_urgent_flag_wins():
    found = match("severe abdominal pain and fainting")
    assert found is not None and found.action == "call_911"


def test_a_flag_in_the_source_quote_counts_too():
    found = match("Lips change color", "lips turning blue")
    assert found is not None and found.name == "blue or grey skin"


@pytest.mark.parametrize(
    ("instructed", "text", "expected", "raised"),
    [
        ("call_care_team", "lips turning blue", "call_911", True),
        ("not_stated", "trouble breathing", "call_911", True),
        ("call_care_team", "severe abdominal pain", "go_to_er", True),
        ("call_911", "severe abdominal pain", "call_911", False),
        ("go_to_er", "vomiting and unable to keep fluids down", "go_to_er", False),
        ("call_care_team", "dizziness", "call_care_team", False),
    ],
)
def test_escalation_only_ever_raises_urgency(instructed, text, expected, raised):
    action, flag = escalate(instructed, text)
    assert action == expected
    assert (flag is not None) is raised
    assert ACTION_RANK[action] >= ACTION_RANK[instructed]


def test_every_rule_uses_a_known_action():
    assert {flag.action for flag in RED_FLAGS} <= set(ACTION_RANK)
