from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
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
