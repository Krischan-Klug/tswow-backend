@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "RESTART_DELAY=3"

rem Ensure npm is available
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js 18+ and ensure PATH is set.
  pause
  exit /b 1
)

rem Install dependencies if missing
if not exist "node_modules" (
  echo [INFO] node_modules missing. Installing dependencies...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo [ERROR] Installation failed.
    pause
    exit /b 1
  )
)

:loop
echo [INFO] Starting application ... (Ctrl+C to stop)
call npm start
echo [INFO] Process exited (Exit code %ERRORLEVEL%). Restarting in %RESTART_DELAY%s ...
timeout /t %RESTART_DELAY% >nul
goto loop
