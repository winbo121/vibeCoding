$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pgBin = Join-Path $root "tools\pgsql\pgsql\bin"
$dataDir = Join-Path $root "tools\pgsql-data"
$pwFile = Join-Path $root "tools\pgpass.txt"

$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$initdb = Join-Path $pgBin "initdb.exe"
$psql = Join-Path $pgBin "psql.exe"

if (-not (Test-Path $initdb)) {
  throw "Portable PostgreSQL binaries missing under tools\pgsql"
}

if (Test-Path (Join-Path $dataDir "PG_VERSION")) {
  Write-Host "Cluster already initialized at $dataDir"
} else {
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  Set-Content -Path $pwFile -Value "vibeCoding123" -NoNewline -Encoding ascii
  & $initdb -D $dataDir -U postgres -A password --pwfile=$pwFile -E UTF8 --locale=C
  $conf = Join-Path $dataDir "postgresql.conf"
  (Get-Content $conf) `
    -replace "#listen_addresses = 'localhost'", "listen_addresses = 'localhost'" `
    -replace "#port = 5432", "port = 5432" | Set-Content $conf
  Add-Content (Join-Path $dataDir "pg_hba.conf") "`nhost all all 127.0.0.1/32 scram-sha-256`nhost all all ::1/128 scram-sha-256"
  Remove-Item $pwFile -Force -ErrorAction SilentlyContinue
}

& $pgCtl -D $dataDir -l (Join-Path $dataDir "logfile.txt") start
Start-Sleep -Seconds 3
$env:PGPASSWORD = "vibeCoding123"
$exists = & $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='vibecoding'"
if ($exists.Trim() -ne "1") {
  & $psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE vibecoding;"
}
Write-Host "Portable PostgreSQL ready (postgres / vibeCoding123 / vibecoding)"
