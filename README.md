# NEPSE Analytics Platform

Market data and analytics for the Nepal Stock Exchange: end-of-day and live quotes, floorsheet and broker analytics, fundamentals, screener, macro data, portfolio tracking and price charts with corporate-action adjustment. The full spec is in `NEPSE_Analytics_Platform_Master_Blueprint.pdf`; conventions are in [docs/CONTRACTS.md](docs/CONTRACTS.md).

## Stack

- **Backend** (`backend/`): FastAPI, SQLAlchemy (async) + Alembic, APScheduler worker, Python 3.12.
- **Frontend** (`frontend/`): Next.js 15, TanStack Query, lightweight-charts, echarts.
- **Data**: TimescaleDB (Postgres 16) and Redis 7.4.

## Run

```bash
cp .env.example .env
docker compose up
```

- Web: http://localhost:3000, API: http://localhost:8000 (`/healthz`), Postgres `:5432`, Redis `:6379`.
- Apply migrations once the stack is up: `docker compose exec api alembic upgrade head`.
- The `worker` service runs the scheduler (live poll, post-close jobs).

## Environment

`docker compose` loads `.env` into `db`, `api` and `worker`; `.env.example` has working local values.

| Variable | Used by | Notes |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `db` container | Must match `DATABASE_URL`. |
| `DATABASE_URL` | backend (`config.py`) | Default `postgresql+asyncpg://nepse:nepse@localhost:5432/nepse`. |
| `REDIS_URL` | backend (`config.py`) | Default `redis://localhost:6379/0`. |
| `JWT_SECRET` | auth API | At least 32 chars; auth endpoints return 503 while unset. |
| `NEPSE_DEV_ENDPOINTS`, `NEPSE_ADMIN_TOKEN` | optional | Gate the dev endpoint in `presentation/api/v1/company.py`. |

The `web` service gets `NEXT_PUBLIC_API_URL` and `API_INTERNAL_URL` from `docker-compose.yml`.

## Tests

Backend (needs the compose `db` and `redis`; DB tests skip without `DATABASE_URL`):

```bash
docker compose exec api sh -c "alembic upgrade head && pytest -q && lint-imports"
```

To test from a git worktree without clashing on ports, see the recipe in [docs/CONTRACTS.md](docs/CONTRACTS.md#running-tests-from-a-worktree-without-clashing-ports).

Frontend:

```bash
cd frontend
npm ci
npm run lint && npx tsc --noEmit && npm test
```

## Contributing

Changes reach `main` only through a pull request: branch from `main`, push, open a PR (the template lists what to check), and merge it on GitHub once the `CI passed` check is green. CI (`.github/workflows/ci.yml`) runs the backend and frontend checks above on every PR into `main` and again on `main` after the merge. It also fails a PR that leaves conflict markers behind or has more than one Alembic head, which happens when parallel branches each add a migration (join the heads in the PR).

## Worker commands

Run inside the worker image, e.g. `docker compose run --rm worker python -m nepse.workers.main <command>`. With no command the scheduler starts.

| Command | What it does |
|---|---|
| `backfill [SYMBOL ...]` | 10 years of ShareSansar history, resumable; then recomputes `adj_factor` for what it loaded. |
| `adjust [SYMBOL ...]` | Recompute `adj_factor` from corporate actions (all companies by default). |
| `verify-adjusted [SYMBOL ...]` | Compare our adjusted closes with NepseAlpha's; logs breaches. |
| `job <id>` | Run one scheduled daily job now (ids: `eod_crosscheck`, `fundamentals_merolagani`, `fundamentals_nepalipaisa`, `macro_nrb`, `macro_sebon`, `verify_adjusted`). |
| `eod` | Run the end-of-day pipeline once, then refresh the screener. |
| `poll` | Run one live-market poll. |
