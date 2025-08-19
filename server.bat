@echo off
cd /d "%~dp0"

:loop
npm start
echo [INFO] PROCESS DOWN (Exitcode %ERRORLEVEL%). RESTART...
timeout /t 3 >nul
goto loop
