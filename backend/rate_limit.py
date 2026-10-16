"""Best-effort limits for the public demo.

Counts live in this process's memory, so they reset on restart and each
instance counts separately. The OpenRouter key's own credit limit is the hard
backstop; these keep one visitor (or a script) from using it all up.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request

WINDOW_SECONDS = 10 * 60
DAY_SECONDS = 24 * 60 * 60
DAILY_LIMIT = 300


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self.clock = clock
        self.hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self.day_start = clock()
        self.day_count = 0

    def check(self, visitor: str, bucket: str, limit: int) -> None:
        now = self.clock()
        if now - self.day_start >= DAY_SECONDS:
            self.day_start, self.day_count = now, 0
        if self.day_count >= DAILY_LIMIT:
            raise HTTPException(
                429, "The demo has reached today's limit. Please try again tomorrow."
            )

        recent = self.hits[(visitor, bucket)]
        while recent and now - recent[0] >= WINDOW_SECONDS:
            recent.popleft()
        if len(recent) >= limit:
            raise HTTPException(
                429,
                "That's a lot of requests in a short time. Please wait a few minutes.",
            )

        recent.append(now)
        self.day_count += 1


def visitor_id(request: Request) -> str:
    # Render and most proxies put the client's address first in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
