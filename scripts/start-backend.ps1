$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  throw "Python venv not found. Run: python -m venv backend\.venv && backend\.venv\Scripts\pip install -r backend\requirements.txt"
}

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$env:PGCLIENTENCODING = "UTF8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location $backend
Write-Host "Starting FastAPI on http://localhost:8000"
& $python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
