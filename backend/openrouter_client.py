import os
from typing import Any

import httpx
from openrouter import OpenRouter, components, errors
from openrouter.utils import BackoffStrategy, RetryConfig

# Fast, inexpensive and reliable with strict JSON output. gpt-oss-120b (used in
# Taskboard) produced malformed or very slow plans for this task.
OPENROUTER_MODEL = "anthropic/claude-haiku-5.5"
OPENROUTER_SERVER_URL = "https://openrouter.ai/api/v1"
OPENROUTER_TIMEOUT_MS = 60_000


class OpenRouterClientError(Exception):
    """Base error for controlled OpenRouter failures."""


class OpenRouterConfigurationError(OpenRouterClientError):
    """Raised when required OpenRouter configuration is missing."""


class OpenRouterRequestError(OpenRouterClientError):
    """Raised when OpenRouter cannot return a usable response."""


class OpenRouterClient:
    def __init__(
        self,
        api_key: str | None = None,
        server_url: str | None = None,
        http_client: httpx.Client | None = None,
        model: str | None = None,
    ) -> None:
        self.model = model or os.getenv("OPENROUTER_MODEL") or OPENROUTER_MODEL
        configured_api_key = api_key or os.getenv("OPENROUTER_API_KEY") or ""
        self.api_key = configured_api_key.strip()
        if not self.api_key:
            raise OpenRouterConfigurationError("OPENROUTER_API_KEY is not configured")

        self.server_url = (
            server_url or os.getenv("OPENROUTER_SERVER_URL") or OPENROUTER_SERVER_URL
        )
        self.http_client = http_client

    def _complete(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int,
        reasoning_effort: str | None = None,
        response_format: components.ResponseFormat | None = None,
        provider: components.ProviderPreferences | None = None,
    ) -> str:
        retry_config = RetryConfig(
            "none",
            BackoffStrategy(0, 0, 1, 0),
            retry_connection_errors=False,
        )

        try:
            with OpenRouter(
                api_key=self.api_key,
                server_url=self.server_url,
                client=self.http_client,
                retry_config=retry_config,
                timeout_ms=OPENROUTER_TIMEOUT_MS,
            ) as sdk:
                response = sdk.chat.send(
                    model=self.model,
                    messages=messages,  # type: ignore[arg-type]
                    max_tokens=max_tokens,
                    reasoning_effort=reasoning_effort,  # type: ignore[arg-type]
                    response_format=response_format,
                    provider=provider,
                    stream=False,
                )
        except httpx.TimeoutException as error:
            raise OpenRouterRequestError("OpenRouter request timed out") from error
        except (httpx.NetworkError, errors.NoResponseError) as error:
            raise OpenRouterRequestError("OpenRouter is unavailable") from error
        except errors.OpenRouterError as error:
            raise OpenRouterRequestError(
                f"OpenRouter request failed with status {error.status_code}"
            ) from error

        if not response.choices:
            raise OpenRouterRequestError("OpenRouter returned an invalid response")

        content = response.choices[0].message.content
        if not isinstance(content, str) or not content.strip():
            raise OpenRouterRequestError("OpenRouter returned an invalid response")

        return content.strip()

    def complete(self, prompt: str) -> str:
        return self._complete(
            [{"role": "user", "content": prompt}],
            max_tokens=128,
        )

    def complete_structured(
        self,
        messages: list[dict[str, str]],
        schema: dict[str, Any],
        *,
        name: str,
        description: str,
        max_tokens: int = 4096,
        reasoning_effort: str | None = None,
    ) -> str:
        return self._complete(
            messages,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
            response_format=components.ChatFormatJSONSchemaConfig(
                type="json_schema",
                json_schema=components.ChatJSONSchemaConfig(
                    name=name,
                    description=description,
                    schema_=schema,
                    strict=True,
                ),
            ),
            provider=components.ProviderPreferences(require_parameters=True),
        )


def run_connectivity_check() -> str:
    answer = OpenRouterClient().complete("Reply with exactly 4. What is 2+2?")
    if answer != "4":
        raise OpenRouterRequestError("OpenRouter returned an incorrect answer")
    return answer


def main() -> None:
    try:
        answer = run_connectivity_check()
    except OpenRouterClientError as error:
        raise SystemExit(f"OpenRouter connectivity check failed: {error}") from error

    print(f"OpenRouter connectivity check passed: {answer}")


if __name__ == "__main__":
    main()
