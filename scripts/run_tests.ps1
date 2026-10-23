# QuantumGuard AI - Run Pytest Test Suite
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\..\backend"

$pytestExe = "pytest"
if (Test-Path ".\.venv\Scripts\pytest.exe") {
    $pytestExe = ".\.venv\Scripts\pytest.exe"
} elseif (Test-Path ".\venv\Scripts\pytest.exe") {
    $pytestExe = ".\venv\Scripts\pytest.exe"
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "QuantumGuard AI - Executing Pytest Suite" -ForegroundColor Green
Write-Host "Using: $pytestExe" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

& $pytestExe -v
