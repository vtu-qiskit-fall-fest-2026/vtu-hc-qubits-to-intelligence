@echo off
setlocal
echo ========================================================
echo QuantumGuard AI - Running Automated Test Suite
echo ========================================================
cd /d "%~dp0..\backend"

set "PYTEST_EXE=pytest"
if exist ".venv\Scripts\pytest.exe" (
    set "PYTEST_EXE=.venv\Scripts\pytest.exe"
) else if exist "venv\Scripts\pytest.exe" (
    set "PYTEST_EXE=venv\Scripts\pytest.exe"
)

echo Running tests with: %PYTEST_EXE%
"%PYTEST_EXE%" -v
pause
