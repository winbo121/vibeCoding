# Start DevHaven (backend + frontend) in one go.
# Optional: -WithPostgres / -WithTomcat
param(
  [switch]$WithPostgres,
  [switch]$WithTomcat,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $PSScriptRoot "start-backend.ps1"
$frontendScript = Join-Path $PSScriptRoot "start-frontend.ps1"
$postgresScript = Join-Path $PSScriptRoot "start-postgres.ps1"
$tomcatScript = Join-Path $PSScriptRoot "start-tomcat.ps1"
$deployScript = Join-Path $PSScriptRoot "deploy-tomcat.ps1"
$portablePg = Join-Path $root "tools\pgsql\pgsql\bin\pg_ctl.exe"

function Test-PortListening([int]$Port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $c
  } catch {
    return $false
  }
}

Write-Host "== DevHaven start-all ==" -ForegroundColor Cyan

# Postgres: only start if portable PG exists and port 5432 is free (or -WithPostgres)
$needPg = $WithPostgres -or (Test-Path $portablePg)
if ($needPg) {
  if (Test-PortListening 5432) {
    Write-Host "PostgreSQL already running on :5432 (skip)"
  } else {
    Write-Host "Starting PostgreSQL..."
    try {
      & powershell -NoProfile -ExecutionPolicy Bypass -File $postgresScript 2>$null
      if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Write-Host "PostgreSQL start warning (exit $LASTEXITCODE). Continuing..." -ForegroundColor Yellow
      } else {
        Write-Host "PostgreSQL started on :5432"
      }
    } catch {
      Write-Host "PostgreSQL start skipped: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

if (Test-PortListening 8000) {
  Write-Host "API already running on :8000 (skip)"
} else {
  Write-Host "Starting API (port 8000)..."
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $backendScript
  )
}

Start-Sleep -Seconds 1

$uiUrl = "http://localhost:5173/vibecoding/"
if ($WithTomcat) {
  Write-Host "Building & deploying frontend to Tomcat..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $deployScript
  if (-not (Test-PortListening 8080)) {
    Write-Host "Starting Tomcat (port 8080)..."
    Start-Process powershell -ArgumentList @(
      "-NoExit",
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $tomcatScript
    )
  } else {
    Write-Host "Tomcat already running on :8080 (skip)"
  }
  $uiUrl = "http://localhost:8080/vibecoding/"
} else {
  if (Test-PortListening 5173) {
    Write-Host "Vite already running on :5173 (skip)"
  } else {
    Write-Host "Starting Vite frontend (port 5173)..."
    Start-Process powershell -ArgumentList @(
      "-NoExit",
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $frontendScript
    )
  }
}

Write-Host ""
Write-Host "UI:  $uiUrl" -ForegroundColor Green
Write-Host "API: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Login: admin/1234  or  user/1234"
Write-Host ""
Write-Host "두 개의 PowerShell 창(API / Frontend)이 열립니다. 닫지 마세요." -ForegroundColor DarkGray

if (-not $NoBrowser) {
  Start-Sleep -Seconds 3
  try { Start-Process $uiUrl } catch { }
}
