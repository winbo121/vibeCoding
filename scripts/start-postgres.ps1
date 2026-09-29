$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pgBin = Join-Path $root "tools\pgsql\pgsql\bin"
$dataDir = Join-Path $root "tools\pgsql-data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"

if (-not (Test-Path $pgCtl)) {
  throw "Portable PostgreSQL not found at $pgBin"
}
if (-not (Test-Path $dataDir)) {
  throw "Data directory missing. Run scripts\init-portable-pg.ps1 first."
}

& $pgCtl -D $dataDir -l (Join-Path $dataDir "logfile.txt") start
Write-Host "PostgreSQL started on localhost:5432"
