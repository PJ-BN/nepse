#!/usr/bin/env sh
# Creates a throwaway nepse_bench DB, migrates it, loads 10M synthetic ticks, prints timings, drops it.
# Usage (from repo root): sh backend/scripts/bench_floorsheet.sh
set -e
export MSYS_NO_PATHCONV=1
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists nepse_bench && createdb -U "$POSTGRES_USER" nepse_bench'
docker compose exec -T -e DATABASE_URL=postgresql+asyncpg://nepse:nepse@db:5432/nepse_bench api alembic upgrade head
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d nepse_bench -v ON_ERROR_STOP=1' < backend/scripts/bench_floorsheet.sql
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" nepse_bench'
