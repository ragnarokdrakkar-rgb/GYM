@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-release.ps1"
set "RESULT=%ERRORLEVEL%"

echo.
if not "%RESULT%"=="0" (
    echo Objavljanje ni uspelo.
    pause
    exit /b %RESULT%
)

echo Build in GitHub Release sta koncana.
pause
exit /b 0
