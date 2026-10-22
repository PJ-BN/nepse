# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
# Env vars (not CLI flags) so pip's isolated build-dependency subprocesses inherit them too.
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app/src PIP_DEFAULT_TIMEOUT=180 PIP_RETRIES=10
COPY pyproject.toml .
RUN --mount=type=cache,target=/root/.cache/pip \
    mkdir -p src/nepse && touch src/nepse/__init__.py && pip install -e ".[dev]"
COPY . .
