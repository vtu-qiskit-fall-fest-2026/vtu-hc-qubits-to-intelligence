# QuantumGuard AI - Start Frontend Vite Server
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\..\frontend"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "QuantumGuard AI - Starting Frontend at http://localhost:5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

npm.cmd run dev
