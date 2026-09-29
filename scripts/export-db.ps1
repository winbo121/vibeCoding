# Export current vibecoding DB to db/vibecoding_dump.sql
param(
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432,
  [string]$PgUser = "postgres",
  [string]$PgPassword = "vibeCoding123",
  [string]$Database = "vibecoding"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outFile = Join-Path $root "db\vibecoding_dump.sql"

$pgDumpCandidates = @(
  (Join-Path $root "tools\pgsql\pgsql\bin\pg_dump.exe"),
  "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
  "pg_dump"
)
$pgDump = $pgDumpCandidates | Where-Object {
  if ($_ -eq "pg_dump") { return $true }
  Test-Path $_
} | Select-Object -First 1

if (-not $pgDump) { throw "pg_dump not found." }

$env:PGPASSWORD = $PgPassword
$env:PGCLIENTENCODING = "UTF8"

Write-Host "Exporting $Database -> $outFile"
& $pgDump -U $PgUser -h $PgHost -p $PgPort -d $Database --no-owner --no-privileges --clean --if-exists --encoding=UTF8 -f $outFile

# Remove pg_dump 18 \restrict lines for broader compatibility
$text = [System.IO.File]::ReadAllText($outFile)
$text = [regex]::Replace($text, '(?m)^\\restrict.*\r?\n', '')
$text = [regex]::Replace($text, '(?m)^\\unrestrict.*\r?\n', '')
[System.IO.File]::WriteAllText($outFile, $text, [System.Text.UTF8Encoding]::new($false))

Write-Host "Done. Size:" (Get-Item $outFile).Length
