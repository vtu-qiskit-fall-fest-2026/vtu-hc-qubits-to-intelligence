@echo off
setlocal
echo ========================================================
echo QuantumGuard AI - Starting Backend Server
echo ========================================================
cd /d "%~dp0..\backend"

set "PYTHON_EXE=python"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
)

echo Serving at http://127.0.0.1:8000
echo Using Python interpreter: %PYTHON_EXE%
"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
