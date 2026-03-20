<#
.\start-dev.ps1

Starts backend and frontend servers in separate PowerShell windows.
Requires project local virtualenv at `.venv` (optional).

Usage:
  .\start-dev.ps1
#>

# Resolve project root (directory containing this script)
$projRoot = Split-Path -Parent $PSCommandPath

# Prefer venv python if available, otherwise fall back to system python
$venvPython = Join-Path $projRoot ".venv\Scripts\python.exe"
if (-Not (Test-Path $venvPython)) {
    Write-Host "Virtualenv python not found at $venvPython. Falling back to system 'python'."
    $venvPython = "python"
}

# Backend command (uvicorn)
$backendCommandLine = "Set-Location -Path '$projRoot'; & '$venvPython' -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

# Frontend static server (python http.server)
$frontendDir = Join-Path $projRoot 'frontend'
$frontendCommandLine = "Set-Location -Path '$projRoot'; & '$venvPython' -m http.server 8080 --directory '$frontendDir'"

Write-Host "Starting backend in a new window..."
Start-Process powershell -ArgumentList '-NoExit','-Command',$backendCommandLine -WorkingDirectory $projRoot

Start-Sleep -Milliseconds 500

Write-Host "Starting frontend static server in a new window..."
Start-Process powershell -ArgumentList '-NoExit','-Command',$frontendCommandLine -WorkingDirectory $projRoot

Write-Host "Done."
Write-Host "Backend: http://127.0.0.1:8000/"
Write-Host "Frontend static: http://127.0.0.1:8080/"
