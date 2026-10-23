@echo off
setlocal
echo ========================================================
echo QuantumGuard AI - One-Click Launch (Complete Full-Stack)
echo ========================================================
cd /d "%~dp0..\backend"

set "PYTHON_EXE=python"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
)

echo Serving built application at http://127.0.0.1:8000
echo Using Python interpreter: %PYTHON_EXE%
echo Opening browser...
start http://127.0.0.1:8000
"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
