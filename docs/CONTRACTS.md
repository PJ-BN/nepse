# Shared contracts for parallel branches

Every workstream branches from `main` and is merged back into `main` at the end. Follow these rules so the merges stay mechanical.

The full spec is in `NEPSE_Analytics_Platform_Master_Blueprint.pdf`. The phased plan below summarises it.

## Branches and ownership

| Branch | Phase | Owns (creates/edits) |
|---|---|---|
| `feat/ingestion` | 2: WASM client, live poller, EOD pipeline, ShareSansar backfill | `infrastructure/upstream/**`, `application/market/poll_live_market.py`, `application/ingestion/**`, `infrastructure/scheduler/**`, `workers/**`, `infrastructure/db/repositories/ingestion*.py` |
| `feat/charting` | 3: adjustment engine, UDF API, market summary, WebSocket, dashboard and chart UI | `domain/corporate_actions/**`, `application/charting/**`, `application/market/get_market_summary.py`, `presentation/api/v1/{udf,market,ws}.py`, `frontend/src/features/{charting,market-overview,live-feed}/**` |
| `feat/floorsheet` | 4: broker analytics, floorsheet API, floorsheet and broker pages | `domain/floorsheet/**`, `application/floorsheet/**`, `presentation/api/v1/floorsheet.py`, `frontend/src/features/{floorsheet,broker-profile}/**` |
| `feat/fundamentals` | 5: MeroLagani/NepaliPaisa, financials, valuation, company page | `domain/fundamentals/**`, `application/fundamentals/**`, `infrastructure/upstream/{merolagani,nepalipaisa}.py`, `presentation/api/v1/company.py`, `frontend/src/features/company/**` |
| `feat/screener-macro` | 6: screener, breadth, RRG, NRB macro, SEBON IPO | `domain/{macro,technicals}/**`, `application/{screener,macro,breadth}/**`, `infrastructure/upstream/{nrb,sebon}.py`, `presentation/api/v1/{screener,macro,breadth}.py`, `frontend/src/features/{screener,macro}/**` |
| `feat/portfolio` | 7: auth, portfolio, WACC, fees and tax | `domain/portfolio/**`, `application/{portfolio,auth}/**`, `presentation/api/v1/{portfolio,auth}.py`, `frontend/src/features/portfolio/**` |

All paths are relative to `backend/src/nepse/` or the repo root. Each branch also owns its own `tests/**` mirror and its own `frontend/src/app/<route>/page.tsx`.

**Shared files.** Only make one-line, additive edits to these:
- `main.py`: one `app.include_router(...)` line per router.
- `pyproject.toml` / `package.json`: avoid edits; every expected dependency is already installed.
- `frontend/src/shared/**`.

## Clean architecture (backend)
- `domain` uses only the standard library. Pydantic is allowed only in `domain/fundamentals/sector_metrics.py`.
- `application` holds use cases (plain functions or small classes) and their ports, each declared as a `typing.Protocol` in `application/<area>/ports.py`. There is no single global ports file.
- `infrastructure` holds the adapters. It reuses `infrastructure/db/models.py` (`Base` plus the core tables). Put new tables in `infrastructure/db/models_<area>.py`, using the same `Base`.
- `presentation` holds FastAPI routers plus DTOs in `presentation/api/schemas/<area>.py`. Routers wire adapters into use cases with `Depends`.
- `docker compose exec api lint-imports` must pass.

## Migrations
- Each branch adds at most one migration: `versions/0002_<area>.py` with `revision = "0002_<area>"` and `down_revision = "0001"`.
- The merge step adds a single Alembic merge revision to join the heads. **Do not** chain onto another branch's revision.
- Write hand-written SQL in the style of `0001_core_schema.py`.

## Live data (Redis), written by `feat/ingestion` and read by everyone else
- `nepse:live:status`: a string holding a `MarketStatus` value (`PRE_OPEN`, `OPEN`, `HALTED` or `CLOSED`).
- `nepse:live:quotes`: a hash keyed by symbol. Each value is JSON:
  `{"symbol","ltp","open","high","low","prev_close","change","pct_change","volume","turnover","ts"}`
- `nepse:live:indices`: a hash keyed by index code (`NEPSE`, `BANKING`, …). Each value is JSON:
  `{"code","value","change","pct_change","turnover","ts"}`
- Pub/sub channel `nepse:live:events`: each message is JSON `{"topic": "quote"|"index"|"status"|"whale", "data": {...}}`.
  - For `quote` and `index`, `data` holds only the entries that changed.
  - For `whale`, `data` is `{"contract_no","symbol","buyer_broker","seller_broker","qty","rate","amount","trade_time"}`.
- `ts` is an ISO-8601 timestamp in NPT.

## WebSocket (`/api/v1/ws/live`, owned by `feat/charting`)
- The client sends `{"subscribe": ["quote","index","status","whale"]}`.
- The server forwards `nepse:live:events` messages for the subscribed topics, unchanged.
- On connect, the server sends a snapshot: `{"topic":"snapshot","data":{"status":..., "quotes":{...}, "indices":{...}}}`.

## Frontend (feature-driven)
- Use `src/features/<name>/` with `components/`, `hooks/`, `api.ts`, `types.ts` and `index.ts` (the public API).
- Routes in `src/app/**/page.tsx` stay thin and import only from `@/features/<name>` or `@/shared/**`.
- Server state goes through TanStack Query. The provider is already in `src/app/layout.tsx`, and the nav lists every route.
- Use `getJson` from `@/shared/api/http` for HTTP.
- Use `lightweight-charts` for price charts and `echarts` (via `echarts-for-react`) for treemaps, Sankey diagrams and RRG.
- Before committing, run `npm run lint` and `npx tsc --noEmit` in `frontend/`. Both must pass.

## Running tests from a worktree without clashing ports
The main stack (`docker compose up -d` in the primary checkout) owns ports 5432, 6379, 8000 and 3000. From a worktree, reuse its DB with your own database, and don't publish ports:
```bash
docker compose -f <primary>/docker-compose.yml exec -T db createdb -U nepse nepse_<area>
docker run --rm --network nepse_default -v "$PWD/backend:/app" -w /app \
  -e DATABASE_URL=postgresql+asyncpg://nepse:nepse@db:5432/nepse_<area> -e REDIS_URL=redis://redis:6379/9 \
  nepse-api sh -c "alembic upgrade head && pytest -q && lint-imports"
```
- Domain and application tests must not need the DB or the network.
- Parser tests use saved fixtures under `tests/infrastructure/fixtures/`.
