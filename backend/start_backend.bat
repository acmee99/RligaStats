@echo off
echo ========================================
echo Starting Flask Backend Server
echo ========================================
echo.

cd /d "%~dp0"

REM Check if venv exists, create if not
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if packages are installed
echo Checking dependencies...
pip show Flask >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies (this may take a few minutes)...
    pip install --upgrade pip
    pip install -r requirements.txt
    echo.
)

REM Create necessary directories
if not exist "instance" mkdir instance
if not exist "uploads" mkdir uploads

REM Start Flask server
echo.
echo ========================================
echo Backend server starting on http://localhost:5000
echo ========================================
echo.
python app.py

pause