@echo off
echo ========================================
echo Football Match Stats Tracker
echo Starting Backend and Frontend Servers
echo ========================================
echo.

cd /d "%~dp0"

REM Start backend in new window
echo Starting backend server...
start "Backend Server - http://localhost:5000" cmd /k "cd backend && start_backend.bat"

REM Wait a few seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend in new window
echo Starting frontend server...
start "Frontend Server - http://localhost:3000" cmd /k "cd frontend && start_frontend.bat"

echo.
echo ========================================
echo Both servers are starting in separate windows
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo The browser should open automatically.
echo Close the windows or press Ctrl+C to stop the servers.
echo.
pause