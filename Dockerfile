FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-fund --no-audit
COPY frontend/ .
RUN npm run build

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/tmp/uv-cache

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev --no-install-project

COPY backend/*.py ./
COPY --from=frontend-builder /app/frontend/out ./static

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 app
USER app

EXPOSE 8000

HEALTHCHECK --interval=5s --timeout=2s --start-period=5s --retries=10 \
    CMD ["/app/.venv/bin/python", "-c", "import os, urllib.request; urllib.request.urlopen(f\"http://127.0.0.1:{os.environ.get('PORT', '8000')}/api/health\", timeout=1).read()"]

# Hosting platforms pass the port in $PORT; local runs use 8000.
# --no-access-log keeps visitor addresses and request lines out of the logs.
CMD ["sh", "-c", "exec /app/.venv/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*' --no-access-log"]
