# One-shot local bootstrap for a new PC (after installing Python/Node/PostgreSQL).
# 1) Copy backend\.env.example -> backend\.env and edit password if needed
# 2) Create venv + install deps
# 3) npm install
# 4) Restore DB schema+seed

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== Backend env =="
$envExample = Join-Path $root "backend\.env.example"
$envFile = Join-Path $root "backend\.env"
if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "Created backend\.env from example. Edit DATABASE_URL password if needed."
} else {
  Write-Host "backend\.env already exists"
}

Write-Host "== Python venv =="
$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  python -m venv (Join-Path $root "backend\.venv")
}
& (Join-Path $root "backend\.venv\Scripts\python.exe") -m pip install --upgrade pip
& (Join-Path $root "backend\.venv\Scripts\pip.exe") install -r (Join-Path $root "backend\requirements.txt")

Write-Host "== Frontend deps =="
Set-Location (Join-Path $root "frontend")
npm install
Set-Location $root

Write-Host "== Database restore (schema + seed) =="
powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\restore-db.ps1")

Write-Host ""
Write-Host "Bootstrap complete."
Write-Host "Next:"
Write-Host "  1) powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1"
Write-Host "  2) powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1"
Write-Host "Login: admin/1234 or user/1234"
