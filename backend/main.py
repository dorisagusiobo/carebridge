from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, StringConstraints

from care_plan import (
    MAX_INSTRUCTIONS_CHARS,
    MIN_INSTRUCTIONS_CHARS,
    PlanError,
    PlanResult,
    StructuredModel,
    build_plan,
)
from openrouter_client import (
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterRequestError,
)
from samples import SAMPLES
from translate import LANGUAGES, TranslateRequest, TranslateResult, translate

app = FastAPI(title="CareBridge")


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instructions: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=MIN_INSTRUCTIONS_CHARS,
            max_length=MAX_INSTRUCTIONS_CHARS,
        ),
    ]


def get_model() -> StructuredModel:
    try:
        return OpenRouterClient()
    except OpenRouterConfigurationError as error:
        raise HTTPException(503, "The AI service isn't configured.") from error


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/samples")
def samples() -> list[dict[str, str]]:
    return [{"id": key, **value} for key, value in SAMPLES.items()]


@app.get("/api/languages")
def languages() -> list[dict[str, str]]:
    return [{"code": code, "name": name} for code, name in LANGUAGES.items()]


@app.post("/api/translate")
def translate_texts(
    request: TranslateRequest,
    model: Annotated[StructuredModel, Depends(get_model)],
) -> TranslateResult:
    try:
        return translate(request, model)
    except ValueError as error:
        raise HTTPException(
            413, "That's too much text to translate at once."
        ) from error
    except OpenRouterRequestError as error:
        raise HTTPException(
            502, "The translation service is unavailable. Please try again."
        ) from error
    except PlanError as error:
        raise HTTPException(
            502, "The translation came back incomplete. Please try again."
        ) from error


@app.post("/api/plan")
def plan(
    request: PlanRequest,
    model: Annotated[StructuredModel, Depends(get_model)],
) -> PlanResult:
    try:
        return build_plan(request.instructions, model)
    except OpenRouterRequestError as error:
        raise HTTPException(
            502, "The AI service couldn't make a plan. Please try again."
        ) from error
    except PlanError as error:
        raise HTTPException(
            502, "The plan came back incomplete. Please try again."
        ) from error


# The exported frontend (frontend/out) is copied here in the Docker image.
# Mounted last so the /api routes above take priority.
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.is_dir():  # pragma: no cover - only present in the built image
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
