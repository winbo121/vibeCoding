$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
Set-Location $frontend
Write-Host "Starting Vite React on http://localhost:5173"
npm run dev
