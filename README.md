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

### First-time setup: get data into the app

A fresh database is empty, so the charts, screener and AI analysis have nothing to show until the worker has loaded data. After `docker compose up` and the migration:

```bash
# 1. Make sure the scheduler worker is running (it is part of `docker compose up`)
docker compose up -d worker

# 2. Load ~10 years of price history (resumable; re-run if interrupted). This also computes adj_factor.
docker compose run --rm worker python -m nepse.workers.main backfill

#    ...or just a few symbols to try it quickly
docker compose run --rm worker python -m nepse.workers.main backfill NABIL EBL HIDCL

# 3. Pull today's end-of-day data and refresh the screener
docker compose run --rm worker python -m nepse.workers.main eod

# 4. Optional: fundamentals and macro data now instead of waiting for the nightly jobs
docker compose run --rm worker python -m nepse.workers.main job fundamentals_merolagani
docker compose run --rm worker python -m nepse.workers.main job fundamentals_nepalipaisa
docker compose run --rm worker python -m nepse.workers.main job macro_nrb
docker compose run --rm worker python -m nepse.workers.main job macro_sebon
```

Check progress with `docker compose logs -f worker`. Once the backfill has finished, open http://localhost:3000/chart.

### What the worker does automatically

With no command the worker starts the scheduler (timezone `Asia/Kathmandu`, trading days only unless noted):

| Schedule | Job |
|---|---|
| Every 20 s, 10:00-15:59 | `live_poll`: live quotes into the snapshot |
| Every minute, 10:00-15:59 | `screener`: refresh the screener materialised view |
| 15:15 | `eod`: end-of-day pipeline, then screener refresh |
| Hourly at :07 | `announcements`: ShareSansar announcements feed |
| Daily (post-close) | `eod_crosscheck`, `fundamentals_*`, `macro_*`, `verify_adjusted` (see `job <id>` below) |
| At startup | `seed_snapshot`: one forced poll so the dashboard has data outside market hours |

Leave the `worker` container running; if it is stopped, live data and the nightly jobs stop updating.

## Features

- **Dashboard**: live index, turnover, breadth and sector indices, plus an on-demand AI market read.
- **Chart**: candlesticks with corporate-action adjustment (ADJ/UNADJ), 1m-1M timeframes, multi-chart layouts, drawing tools with undo/redo and per-timeframe persistence, 40+ indicators and a custom-indicator builder, symbol compare, bar replay, client-side price alerts and screenshots.
- **AI Technical Analysis**: a professional-style research note on the chart (see below).
- **Company**, **Floorsheet**, **Brokers**, **Screener**, **Simulator**, **Mutual funds**, **Macro**, **Dividends**, **IPO**, **Portfolio**.

## AI Technical Analysis

Click **AI Technical Analysis** on the chart page. The Next.js route `frontend/src/app/api/ai/chart/[symbol]/route.ts` fetches up to 2 years of adjusted candles from `/api/v1/udf/history` (so the worker's backfill must have run) and passes them to `frontend/src/features/ai/`:

1. **Quant engine** (`chartQuant.ts`, deterministic, no network): computes trend regime (EMA/SMA stack, ADX/DI), market structure (HH/HL/LH/LL, breaks of structure), momentum (RSI, MACD, stochastic, RSI divergence), volatility (ATR, Bollinger squeeze, expected move), volume (OBV, up/down volume, 120-bar volume profile with POC and value area), clustered support/resistance with touch counts, Fibonacci levels, candle patterns, weekly/monthly trend, and an 11-factor confluence score (-100..+100). It also builds the trade plan (entry zone, stop, 3 targets, R:R, shares per NPR 10k risk), bull/base/bear scenarios, the chart drawings and the recommended indicators.
2. **LLM narrative** (`agyRunner.ts`): the full quant pack is sent to the `agy` CLI, which writes the executive summary and the structure, momentum, volume, multi-timeframe and execution sections. Prices from the engine are authoritative; the model only supplies the title, stance, confidence and text.
3. **Fallback**: if `agy` is missing, fails or times out (120 s), the page still shows the full quant analysis with an engine-written narrative (`source: "heuristic"` in the response).

Results are cached in memory for 10 minutes per symbol and timeframe; the refresh button bypasses the cache. Scenario probabilities are estimates derived from the confluence score, not forecasts, and nothing here is investment advice.

### Running the LLM (agy)

- **Frontend on your machine** (`npm run dev` in `frontend/`): install the `agy` CLI so it is on `PATH`; it is invoked directly.
- **Frontend in Docker** (`docker compose up web`): the container has no `agy`, so start the host bridge on your machine and the app calls it at `AGY_BRIDGE_URL` (default `http://host.docker.internal:4141`):

  ```bash
  node scripts/agy_bridge.js          # listens on :4141, override with AGY_BRIDGE_PORT
  ```

Without either, you get the heuristic narrative above.

## Environment

`docker compose` loads `.env` into `db`, `api` and `worker`; `.env.example` has working local values.

| Variable | Used by | Notes |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `db` container | Must match `DATABASE_URL`. |
| `DATABASE_URL` | backend (`config.py`) | Default `postgresql+asyncpg://nepse:nepse@localhost:5432/nepse`. |
| `REDIS_URL` | backend (`config.py`) | Default `redis://localhost:6379/0`. |
| `JWT_SECRET` | auth API | At least 32 chars; auth endpoints return 503 while unset. |
| `AGY_BRIDGE_URL`, `AGY_BRIDGE_PORT` | frontend / `scripts/agy_bridge.js` | Where the Docker frontend reaches the host `agy` bridge (default `http://host.docker.internal:4141`) and the port the bridge listens on. |
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
