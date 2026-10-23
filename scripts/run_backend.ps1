# QuantumGuard AI - Start Backend FastAPI Server
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\..\backend"

$pythonExe = "python"
if (Test-Path ".\.venv\Scripts\python.exe") {
    $pythonExe = ".\.venv\Scripts\python.exe"
} elseif (Test-Path ".\venv\Scripts\python.exe") {
    $pythonExe = ".\venv\Scripts\python.exe"
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "QuantumGuard AI - Starting Backend Server at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Using Python: $pythonExe" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

& $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
