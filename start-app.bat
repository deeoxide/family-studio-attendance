@echo off
REM ===================================================================
REM  Family Studio Attendance - one-click launcher
REM  Opens the API server and the web app, each in its own window.
REM ===================================================================
cd /d "%~dp0"

echo Starting API server  -^>  http://localhost:4000
start "Attendance API" cmd /k "cd /d ""%~dp0server"" && npm run dev"

REM give the API a few seconds to boot before the app tries to reach it
timeout /t 4 /nobreak >nul

echo Starting web app     -^>  http://localhost:8081  (opens in your browser)
start "Attendance Web" cmd /k "cd /d ""%~dp0mobile"" && npm run web"

echo.
echo Two terminal windows opened. Your browser will open the app automatically.
echo To stop everything, close both windows (or press Ctrl+C in each).
echo.
pause
