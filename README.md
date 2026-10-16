# CareBridge

Turns hospital discharge instructions into a plain-language care plan a patient can follow at home.

> CareBridge explains instructions. It doesn't diagnose, and it doesn't replace the care team. The demo uses fictional patients only.

## The problem

Discharge paperwork is dense: "Furosemide 40 mg PO daily", "Albuterol q4-6h PRN SOB", "F/u with PCP". Patients go home unsure what to take, what to avoid and when to worry. Missed doses and missed warning signs are a common reason people end up back in hospital.

## How it stays safe

The AI extracts; it never advises.

- **Every item must quote the instructions.** Each medicine, appointment, instruction and warning sign comes with a word-for-word quote. Code checks the quote is really in the instructions and drops the item if it isn't, so the plan can't contain anything the care team didn't write.
- **Purposes are only given when stated.** If the instructions don't say what a medicine is for, the plan doesn't guess.
- **Code, not the AI, reads what to do about a warning sign.** "CALL 911 IF", "Return to the ER" and "CALL YOUR DOCTOR IF" are read from the text around each symptom.
- **Gaps become questions.** Missing dates or durations turn into questions to ask the care team instead of guesses.
- **Instructions are treated as data**, so text inside them can't change the rules.

## Run it

```bash
cd backend
uv sync
cp ../.env.example ../.env   # add OPENROUTER_API_KEY
set -a && . ../.env && set +a
uv run uvicorn main:app --reload
```

- `GET /api/health`
- `GET /api/samples`: three fictional patients
- `POST /api/plan` with `{"instructions": "..."}`: returns `{plan, dropped}`

## Tests

```bash
uv run pytest            # fast tests with a stand-in model, 100% coverage
uv run pytest -m live    # the three sample patients against the real model
```

## Status

- [x] Day 1: instructions → structured, grounded care plan
- [ ] Day 2: plain-language plan view
- [ ] Day 3: warning-sign rules and escalation
- [ ] Day 4: daily check-in and progress log
- [ ] Day 5: read aloud and translation
- [ ] Day 6–7: deploy, notices, case study

Model: `anthropic/claude-haiku-5.5` through OpenRouter (set `OPENROUTER_MODEL` to change it).
