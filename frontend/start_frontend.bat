@echo off
echo ========================================
echo Starting React Frontend Server
echo ========================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies (this may take a few minutes)...
    call npm install
    echo.
)

REM Start React development server
echo.
echo ========================================
echo Frontend server starting on http://localhost:3000
echo ========================================
echo.
call npm start

pause