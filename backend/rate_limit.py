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
    """The visitor's address, in a form they can't fake.

    Render sits behind Cloudflare, which sets CF-Connecting-IP itself and
    overwrites any value a visitor sends. X-Forwarded-For is not safe to read
    from the left: Render appends to it rather than replacing what the visitor
    sent, so its first entry can be anything. The last entry is the one added
    by the proxy closest to us.
    """
    cloudflare = request.headers.get("cf-connecting-ip", "").strip()
    if cloudflare:
        return cloudflare
    forwarded = [
        part.strip()
        for part in request.headers.get("x-forwarded-for", "").split(",")
        if part.strip()
    ]
    if forwarded:
        return forwarded[-1]
    return request.client.host if request.client else "unknown"
