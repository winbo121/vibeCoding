$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pgBin = Join-Path $root "tools\pgsql\pgsql\bin"
$systemPsql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (Test-Path (Join-Path $pgBin "psql.exe")) {
  $psql = Join-Path $pgBin "psql.exe"
} elseif (Test-Path $systemPsql) {
  $psql = $systemPsql
} else {
  throw "psql.exe not found."
}

$env:PGPASSWORD = "vibeCoding123"
Write-Host "Using $psql"
& $psql -U postgres -h localhost -p 5432 -c "SELECT version();"

$exists = & $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='vibecoding'"
if ($exists.Trim() -ne "1") {
  Write-Host "Creating database vibecoding..."
  & $psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE vibecoding;"
} else {
  Write-Host "Database vibecoding already exists."
}

Write-Host "Database 'vibecoding' is ready."
