<#
.SYNOPSIS
    NEPSE Analytics Data Ingestion Utility for PowerShell
.EXAMPLE
    .\sync.ps1 -Job eod
    .\sync.ps1 -Job all
#>
param (
    [ValidateSet("eod", "news", "sebon", "crosscheck", "all", "ai-master")]
    [string]$Job = "eod"
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "             NEPSE ANALYTICS - DATA INGESTION UTILITY                " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

switch ($Job) {
    "eod" {
        Write-Host "`n[RUNNING] Ingesting EOD market data..." -ForegroundColor Yellow
        docker compose run --rm worker python -m nepse.workers.main eod
    }
    "news" {
        Write-Host "`n[RUNNING] Ingesting latest news and regulatory circulars..." -ForegroundColor Yellow
        docker compose run --rm worker python -m nepse.workers.main news
    }
    "sebon" {
        Write-Host "`n[RUNNING] Ingesting SEBON IPO & Right-Share pipeline..." -ForegroundColor Yellow
        docker compose run --rm worker python -m nepse.workers.main job macro_sebon
    }
    "crosscheck" {
        Write-Host "`n[RUNNING] Crosschecking EOD bars with ShareSansar..." -ForegroundColor Yellow
        docker compose run --rm worker python -m nepse.workers.main job eod_crosscheck
    }
    "all" {
        Write-Host "`n[RUNNING] Executing Full Evening Sync..." -ForegroundColor Yellow
        docker compose run --rm worker sh -c "python -m nepse.workers.main eod && python -m nepse.workers.main news && python -m nepse.workers.main job macro_sebon && python -m nepse.workers.main job eod_crosscheck"
    }
    "ai-master" {
        Write-Host "`n[RUNNING] Executing AI Evening Master Pipeline (Macro + Trade + Watchlist)..." -ForegroundColor Yellow
        docker compose run --rm worker python -m nepse.workers.main ai-master
    }
}

Write-Host "`n[SUCCESS] Ingestion task '$Job' finished.`n" -ForegroundColor Green
