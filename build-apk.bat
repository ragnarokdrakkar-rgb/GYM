@echo off
setlocal

echo ==========================================
echo Workout Tracker Android build
echo ==========================================

set "ROOT=%~dp0"
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%ROOT%"

echo.
echo [1/4] Pripravljam www mapo...

if not exist www mkdir www

copy /Y index.html www\index.html >nul
copy /Y manifest.json www\manifest.json >nul
copy /Y icon-192.png www\icon-192.png >nul
copy /Y icon-512.png www\icon-512.png >nul
copy /Y icon-maskable-512.png www\icon-maskable-512.png >nul

if exist sw.js copy /Y sw.js www\sw.js >nul

echo [2/4] Capacitor sync...
call npx cap sync android

if errorlevel 1 (
    echo.
    echo NAPAKA: Capacitor sync ni uspel.
    pause
    exit /b 1
)

echo [3/4] Gradle debug build...
cd /d "%ROOT%android"
call gradlew.bat assembleDebug

if errorlevel 1 (
    echo.
    echo NAPAKA: Android build ni uspel.
    pause
    exit /b 1
)

echo [4/4] Kopiram APK na namizje...
copy /Y "app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\Workout-Tracker-Test.apk" >nul

echo.
echo ==========================================
echo BUILD USPESEL
echo APK:
echo %USERPROFILE%\Desktop\Workout-Tracker-Test.apk
echo ==========================================
pause