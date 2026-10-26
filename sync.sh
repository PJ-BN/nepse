#!/usr/bin/env bash
set -e

JOB="${1:-eod}"

echo "====================================================================="
echo "             NEPSE ANALYTICS - DATA INGESTION UTILITY                "
echo "====================================================================="

case "$JOB" in
  eod)
    echo "[RUNNING] Ingesting EOD market data..."
    docker compose run --rm worker python -m nepse.workers.main eod
    ;;
  news)
    echo "[RUNNING] Ingesting latest news and regulatory circulars..."
    docker compose run --rm worker python -m nepse.workers.main news
    ;;
  sebon)
    echo "[RUNNING] Ingesting SEBON IPO & Right-Share pipeline..."
    docker compose run --rm worker python -m nepse.workers.main job macro_sebon
    ;;
  crosscheck)
    echo "[RUNNING] Crosschecking EOD bars with ShareSansar..."
    docker compose run --rm worker python -m nepse.workers.main job eod_crosscheck
    ;;
  all)
    echo "[RUNNING] Executing Full Evening Sync..."
    docker compose run --rm worker sh -c "python -m nepse.workers.main eod && python -m nepse.workers.main news && python -m nepse.workers.main job macro_sebon && python -m nepse.workers.main job eod_crosscheck"
    ;;
  *)
    echo "Usage: ./sync.sh [eod|news|sebon|crosscheck|all]"
    exit 1
    ;;
esac

echo "[SUCCESS] Ingestion task '$JOB' finished."
