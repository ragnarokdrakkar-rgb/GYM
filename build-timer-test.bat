@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-timer-test.ps1"
set "RESULT=%ERRORLEVEL%"

echo.
if not "%RESULT%"=="0" (
    echo TIMER TEST build ni uspel.
    pause
    exit /b %RESULT%
)

echo TIMER TEST APK je pripravljen.
pause
exit /b 0
