@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo               NEPSE ANALYTICS - DATA INGESTION UTILITY                
echo =====================================================================
echo.
echo   [1] EOD Market Data      (Closing prices, indices, floorsheet, screener)
echo   [2] News & Circulars     (ShareSansar, SEBON, NRB, MoF with AI scoring)
echo   [3] SEBON Pipeline       (IPO & Right-share application filings)
echo   [4] EOD Crosscheck       (Verify NEPSE prices against ShareSansar)
echo   [5] FULL EVENING SYNC    (Run 1 + 2 + 3 + 4 sequentially)
echo   [6] AI Evening Pipeline  (Run 4:00 PM Master AI: Macro + Trade + Watchlist)
echo   [7] Promote Admin User   (Grant admin privileges to an email)
echo.
set /p CHOICE="Select an option [1-7] (default 1): "
if "%CHOICE%"=="" set CHOICE=1

if "%CHOICE%"=="1" (
    echo.
    echo [RUNNING] Ingesting EOD market data...
    docker compose run --rm worker python -m nepse.workers.main eod
) else if "%CHOICE%"=="2" (
    echo.
    echo [RUNNING] Ingesting latest news and regulatory circulars...
    docker compose run --rm worker python -m nepse.workers.main news
) else if "%CHOICE%"=="3" (
    echo.
    echo [RUNNING] Ingesting SEBON IPO & Right-Share pipeline...
    docker compose run --rm worker python -m nepse.workers.main job macro_sebon
) else if "%CHOICE%"=="4" (
    echo.
    echo [RUNNING] Crosschecking EOD bars with ShareSansar...
    docker compose run --rm worker python -m nepse.workers.main job eod_crosscheck
) else if "%CHOICE%"=="5" (
    echo.
    echo [RUNNING] Executing Full Evening Sync...
    docker compose run --rm worker sh -c "python -m nepse.workers.main eod && python -m nepse.workers.main news && python -m nepse.workers.main job macro_sebon && python -m nepse.workers.main job eod_crosscheck"
) else if "%CHOICE%"=="6" (
    echo.
    echo [RUNNING] Executing AI Evening Master Pipeline (Macro + Trade + Watchlist)...
    docker compose run --rm worker python -m nepse.workers.main ai-master
) else if "%CHOICE%"=="7" (
    echo.
    set /p ADMIN_EMAIL="Enter user email to promote to admin: "
    docker compose run --rm worker python -m nepse.workers.main make-admin !ADMIN_EMAIL!
) else (
    echo Invalid option selected.
)

echo.
echo =====================================================================
echo Ingestion task completed.
echo =====================================================================
pause
