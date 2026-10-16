"""Rules that escalate recognized emergency signs, whatever the paperwork says.

Discharge instructions sometimes under-state urgency ("Seek care for: lips
turning blue"). These rules are fixed code, not the model, and they only ever
raise the urgency of a warning sign, never lower it.

Source: the American College of Emergency Physicians' warning signs of a
medical emergency, as listed by MedlinePlus (U.S. National Library of
Medicine), "Recognizing medical emergencies", reviewed 1/8/2025:
https://medlineplus.gov/ency/article/001927.htm
"""

import re
from dataclasses import dataclass

# Higher is more urgent.
ACTION_RANK = {"not_stated": 0, "call_care_team": 1, "go_to_er": 2, "call_911": 3}


@dataclass(frozen=True)
class RedFlag:
    name: str
    action: str
    pattern: re.Pattern[str]


def _flag(name: str, action: str, *phrases: str) -> RedFlag:
    return RedFlag(name, action, re.compile("|".join(phrases), re.IGNORECASE))


RED_FLAGS: list[RedFlag] = [
    # Call 911: signs that can be life-threatening.
    _flag(
        "breathing problems",
        "call_911",
        r"\b(trouble|difficult(y|ies)|hard|struggl\w*|problems?) (with )?breath",
        r"short(ness)? of breath",
        r"\bSOB\b",
        r"can'?t (catch your )?breath",
        r"unable to breathe",
        r"\bbreathless",
    ),
    _flag("chest pain", "call_911", r"chest (pain|pressure|tightness|discomfort)"),
    _flag(
        "fainting",
        "call_911",
        r"\bfaint",
        r"pass(es|ed|ing)? out",
        r"(loss of|lose|losing) consciousness",
        r"unconscious",
        r"unresponsive",
    ),
    _flag(
        "change in mental status",
        "call_911",
        r"confus",
        r"hard to wake",
        r"difficulty (arousing|waking)",
        r"unusual behavio",
        r"not making sense",
    ),
    _flag(
        "blue or grey skin",
        "call_911",
        r"(lips?|face|skin|fingers?|nails?)\b[^.,;]{0,20}\b(blue|bluish|gr[ae]y)",
        r"(blue|bluish|gr[ae]y)\b[^.,;]{0,20}\b(lips?|face|skin|fingers?|nails?)",
        r"cyanosis",
    ),
    _flag(
        "coughing up or vomiting blood",
        "call_911",
        r"(cough|vomit|throw)\w*( up)? blood",
        r"blood in (your )?(vomit|spit|sputum)",
    ),
    _flag(
        "bleeding that won't stop",
        "call_911",
        r"bleeding (that )?(will not|won'?t|does not|doesn'?t) stop",
        r"(heavy|severe|uncontrolled) bleeding",
    ),
    _flag(
        "swelling of the face or tongue",
        "call_911",
        r"swell\w* (of|in) (the |your )?(face|eyes?|lips?|tongue|throat)",
        r"(face|eye|lip|tongue|throat) swelling",
    ),
    _flag(
        "trouble speaking",
        "call_911",
        r"(inability|unable|trouble|difficulty) (to )?speak",
        r"slurred speech",
    ),
    _flag("seizure", "call_911", r"seizure", r"convulsion"),
    # Emergency room at least.
    _flag("severe belly pain", "go_to_er", r"severe (abdominal|belly|stomach) pain"),
    _flag(
        "severe or persistent vomiting or diarrhea",
        "go_to_er",
        r"(severe|persistent|constant|nonstop) (vomiting|diarrh)",
        r"(unable|can'?t|cannot) (to )?keep (fluids|liquids|anything|food) down",
    ),
    _flag("sudden severe pain", "go_to_er", r"sudden,? severe pain"),
    _flag(
        "sudden dizziness, weakness or vision change",
        "go_to_er",
        r"sudden (dizziness|weakness|numbness|change in (vision|eyesight)|vision (loss|change))",
    ),
]


def match(*texts: str) -> RedFlag | None:
    """The most urgent red flag found in any of the texts, if any."""
    found = [flag for flag in RED_FLAGS for text in texts if flag.pattern.search(text)]
    return max(found, key=lambda flag: ACTION_RANK[flag.action], default=None)


def escalate(instructed_action: str, *texts: str) -> tuple[str, RedFlag | None]:
    """The action to show, and the red flag that raised it (None if the
    instructions were already at least as urgent)."""
    flag = match(*texts)
    if flag and ACTION_RANK[flag.action] > ACTION_RANK[instructed_action]:
        return flag.action, flag
    return instructed_action, None
