FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app/src
COPY pyproject.toml .
RUN mkdir -p src/nepse && touch src/nepse/__init__.py && pip install --no-cache-dir --timeout 120 --retries 10 -e ".[dev]"
COPY . .
