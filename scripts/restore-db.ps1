# Restore VibeCoding DB from SQL files.
# Prerequisite: PostgreSQL running, psql available.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -UseFullDump
#   powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -PgHost localhost -PgPort 5432 -PgUser postgres -PgPassword vibeCoding123

param(
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432,
  [string]$PgUser = "postgres",
  [string]$PgPassword = "vibeCoding123",
  [string]$Database = "vibecoding",
  [switch]$UseFullDump
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dbDir = Join-Path $root "db"

$psqlCandidates = @(
  (Join-Path $root "tools\pgsql\pgsql\bin\psql.exe"),
  "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "psql"
)
$psql = $psqlCandidates | Where-Object {
  if ($_ -eq "psql") { return $true }
  Test-Path $_
} | Select-Object -First 1

if (-not $psql) { throw "psql not found. Install PostgreSQL or place portable binaries under tools\pgsql." }

$env:PGPASSWORD = $PgPassword
$env:PGCLIENTENCODING = "UTF8"

Write-Host "Using: $psql"
Write-Host "Creating database if missing..."
& $psql -U $PgUser -h $PgHost -p $PgPort -d postgres -v ON_ERROR_STOP=1 -f (Join-Path $dbDir "00_create_database.sql")

if ($UseFullDump) {
  $dump = Join-Path $dbDir "vibecoding_dump.sql"
  if (-not (Test-Path $dump)) { throw "Missing $dump" }
  Write-Host "Restoring full dump: $dump"
  & $psql -U $PgUser -h $PgHost -p $PgPort -d $Database -v ON_ERROR_STOP=1 -f $dump
} else {
  Write-Host "Applying schema.sql ..."
  & $psql -U $PgUser -h $PgHost -p $PgPort -d $Database -v ON_ERROR_STOP=1 -f (Join-Path $dbDir "schema.sql")
  Write-Host "Applying seed.sql ..."
  & $psql -U $PgUser -h $PgHost -p $PgPort -d $Database -v ON_ERROR_STOP=1 -f (Join-Path $dbDir "seed.sql")
}

Write-Host "DB restore complete."
Write-Host "Login: admin/1234 (admin), user/1234 (user)"
