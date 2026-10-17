# CareBridge

Turns hospital discharge instructions into a plain-language care plan a patient can follow at home.

**[Try the live demo](https://carebridge-ojwt.onrender.com)** · **[Read the case study](https://doris-agusiobo-echianu.vercel.app/work/carebridge)**

> CareBridge explains instructions. It doesn't diagnose, and it doesn't replace the care team. The demo uses fictional patients only.

## The problem

Discharge paperwork is dense: "Furosemide 40 mg PO daily", "Albuterol q4-6h PRN SOB", "F/u with PCP". Patients go home unsure what to take, what to avoid and when to worry. Missed doses and missed warning signs are a common reason people end up back in hospital.

## How it stays safe

The AI extracts; it never advises.

- **Every item must quote the instructions.** Each medicine, appointment, instruction and warning sign comes with a word-for-word quote. Code checks the quote is really in the instructions and drops the item if it isn't, so the plan can't contain anything the care team didn't write.
- **Purposes are only given when stated.** If the instructions don't say what a medicine is for, the plan doesn't guess.
- **Code, not the AI, reads what to do about a warning sign.** "CALL 911 IF", "Return to the ER" and "CALL YOUR DOCTOR IF" are read from the text around each symptom.
- **Emergency signs always escalate.** Fixed rules based on the American College of Emergency Physicians' warning signs of a medical emergency ([MedlinePlus](https://medlineplus.gov/ency/article/001927.htm)) raise signs like trouble breathing, chest pain, confusion or blue lips to "call 911", even when the paperwork says "seek care". Rules only ever raise urgency, and the plan says when and why it did.
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
- `GET /api/languages`, `POST /api/translate` with `{language, texts, cacheable}`

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, proxies /api to the backend on :8000
```

CareBridge has its own "Harbor" palette (harbor blue, navy ink and a violet highlight), chosen so nothing competes with the red, orange and amber used for warning signs; every text pair passes WCAG AA in light and dark mode. The plan view groups warning signs by urgency (911, emergency room, call your care team), labels new, changed and stopped medicines, can show the quote behind every line, prints cleanly, and turns gaps into questions to copy. Body text uses Atkinson Hyperlegible, a typeface designed by the Braille Institute for readers with low vision.

### Daily check-in

Questions come straight from the plan (no AI): which warning signs you have today, whether you took each medicine, and which self-care steps you did. Reporting a warning sign shows what to do right away, using the plan's checked action (so blue lips means "Call 911 now" even if the paperwork said "seek care"). A missed dose never gets dosing advice, only "ask your care team or pharmacist". The plan and check-ins are saved in the browser only; nothing is stored on a server, and Start over deletes them.

### Translation and read aloud

The plan, the check-in and every label can be shown in English, Spanish, Simplified Chinese, Vietnamese, Tagalog, Arabic (right to left), Korean, Russian, Haitian Creole, Portuguese or French, the languages most often spoken by U.S. residents with limited English.

- Translation runs after grounding and the red-flag rules, on display text only. Medicine names, doses, actions and source quotes are never sent.
- Each translated line must keep the same numbers (doses, days, phone numbers) and placeholders as the English. Any line that doesn't stays in English, and the page says so.
- Translated plans carry a notice that the translation is by AI and suggest asking for a free medical interpreter.
- Interface labels are cached on the server; plan text is never kept there.
- Read aloud uses the browser's own voices in the chosen language, and says when the device has no voice for it.

## Deploy

```bash
docker build -t carebridge .
docker run --env-file .env -p 8000:8000 carebridge   # http://localhost:8000
```

On Render: **New > Blueprint**, connect this repo and paste `OPENROUTER_API_KEY` when asked. `render.yaml` sets up a free web service with a health check.

For a public demo:
- Each visitor gets 6 plans and 20 translations per 10 minutes, and the whole demo is capped at 300 AI calls a day (in memory, best effort). Set a credit limit on the OpenRouter key as the hard backstop.
- Nothing is stored on the server, request lines aren't logged, and API responses are sent with `Cache-Control: no-store`.
- Security headers are set on every response, the API docs are turned off, and the container runs as an unprivileged user.

## Tests

```bash
uv run pytest            # fast tests with a stand-in model, 100% coverage
uv run pytest -m live    # the three sample patients against the real model
cd ../frontend && npm test   # component and page tests
```

## Status

- [x] Day 1: instructions → structured, grounded care plan
- [x] Day 2: plain-language plan view
- [x] Day 3: warning-sign rules and escalation
- [x] Day 4: daily check-in and progress log
- [x] Day 5: read aloud and translation
- [x] Day 6: Docker image, Render blueprint, limits and security headers
- [x] Day 7: deployed on Render, case study published

Model: `anthropic/claude-haiku-5.5` through OpenRouter (set `OPENROUTER_MODEL` to change it).
