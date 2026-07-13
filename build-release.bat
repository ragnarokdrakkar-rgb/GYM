@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "ANDROID_DIR=%ROOT%android"
set "GRADLE_FILE=%ANDROID_DIR%\app\build.gradle"
set "GRADLE_BACKUP=%ANDROID_DIR%\app\build.gradle.release-backup"
set "VERSION_SCRIPT=%ROOT%update-version.ps1"
set "BUNDLE_SCRIPT=%ROOT%build-app-bundle.ps1"

set "KEYSTORE=C:\WorkoutTrackerKeys\workout-tracker-release.jks"
set "KEY_PROPERTIES=C:\WorkoutTrackerKeys\keystore.properties"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

title Workout Tracker Release Builder

echo.
echo ==========================================
echo   WORKOUT TRACKER - RELEASE BUILD
echo ==========================================
echo.

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo NAPAKA: Java ni najdena:
    echo %JAVA_HOME%\bin\java.exe
    goto :error
)

if not exist "%KEYSTORE%" (
    echo NAPAKA: Signing key ni najden:
    echo %KEYSTORE%
    goto :error
)

if not exist "%KEY_PROPERTIES%" (
    echo NAPAKA: keystore.properties ni najden:
    echo %KEY_PROPERTIES%
    goto :error
)

if not exist "%GRADLE_FILE%" (
    echo NAPAKA: build.gradle ni najden:
    echo %GRADLE_FILE%
    goto :error
)

if not exist "%VERSION_SCRIPT%" (
    echo NAPAKA: update-version.ps1 ni najden:
    echo %VERSION_SCRIPT%
    goto :error
)
if not exist "%BUNDLE_SCRIPT%" (
    echo NAPAKA: build-app-bundle.ps1 ni najden:
    echo %BUNDLE_SCRIPT%
    goto :error
)

echo.
echo Sestavljam stabilni js\app.js iz source datotek ...

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%BUNDLE_SCRIPT%" -Quiet

if errorlevel 1 (
    echo NAPAKA: app bundle ni bil pravilno sestavljen.
    goto :error
)

if not exist "%ROOT%index.html" (
    echo NAPAKA: index.html ni najden:
    echo %ROOT%index.html
    goto :error
)

set /p "VERSION=Vpisi novo verzijo, na primer 1.0.2: "

if "%VERSION%"=="" (
    echo NAPAKA: Verzija ne sme biti prazna.
    goto :error
)

echo.
echo Nova verzija: %VERSION%
echo.

echo [1/6] Posodabljam Android verzijo ...

copy /Y "%GRADLE_FILE%" "%GRADLE_BACKUP%" >nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%VERSION_SCRIPT%" -GradleFile "%GRADLE_FILE%" -Version "%VERSION%"

if errorlevel 1 (
    echo NAPAKA pri posodabljanju verzije.
    goto :rollback
)

echo [2/6] Pripravljam WWW mapo ...

if exist "%ROOT%www" (
    rmdir /S /Q "%ROOT%www"
)

mkdir "%ROOT%www"

copy /Y "%ROOT%index.html" "%ROOT%www\index.html" >nul

if exist "%ROOT%manifest.json" (
    copy /Y "%ROOT%manifest.json" "%ROOT%www\manifest.json" >nul
)



if exist "%ROOT%icon-192.png" (
    copy /Y "%ROOT%icon-192.png" "%ROOT%www\icon-192.png" >nul
)

if exist "%ROOT%icon-512.png" (
    copy /Y "%ROOT%icon-512.png" "%ROOT%www\icon-512.png" >nul
)

if exist "%ROOT%icon-maskable-512.png" (
    copy /Y "%ROOT%icon-maskable-512.png" "%ROOT%www\icon-maskable-512.png" >nul
)

for %%D in (css js assets vendor) do (
    if exist "%ROOT%%%D" (
        xcopy /E /I /Y "%ROOT%%%D" "%ROOT%www\%%D" >nul
    )
)
echo Prilagajam index.html za Android ...

powershell.exe -NoProfile -ExecutionPolicy Bypass ^
-File "%ROOT%prepare-android.ps1" ^
-IndexFile "%ROOT%www\index.html"

if errorlevel 1 (
    echo NAPAKA: Android index ni bil pravilno pripravljen.
    goto :rollback
)

if exist "%ROOT%www\sw.js" (
    del /F /Q "%ROOT%www\sw.js"
)

echo [3/6] Capacitor sync ...

cd /d "%ROOT%"
call npx cap sync android

if errorlevel 1 (
    echo NAPAKA: Capacitor sync ni uspel.
    goto :rollback
)

echo [4/6] Gradle release build ...

cd /d "%ANDROID_DIR%"
call gradlew.bat assembleRelease

if errorlevel 1 (
    echo NAPAKA: Gradle release build ni uspel.
    goto :rollback
)

echo [5/6] Kopiram podpisani APK ...

if not exist "%ROOT%release" (
    mkdir "%ROOT%release"
)

set "SOURCE_APK=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk"
set "OUTPUT_APK=%ROOT%release\Workout-Tracker-v%VERSION%.apk"
set "OUTPUT_HASH=%ROOT%release\Workout-Tracker-v%VERSION%-SHA256.txt"

if not exist "%SOURCE_APK%" (
    echo NAPAKA: Zgrajeni APK ni najden:
    echo %SOURCE_APK%
    goto :rollback
)

copy /Y "%SOURCE_APK%" "%OUTPUT_APK%" >nul

if errorlevel 1 (
    echo NAPAKA: APK-ja ni bilo mogoce kopirati.
    goto :rollback
)

echo [6/6] Racunam SHA-256 ...

certutil -hashfile "%OUTPUT_APK%" SHA256 > "%OUTPUT_HASH%"

if errorlevel 1 (
    echo NAPAKA pri racunanju SHA-256.
    goto :rollback
)

if exist "%GRADLE_BACKUP%" (
    del /F /Q "%GRADLE_BACKUP%" >nul
)

echo.
echo ==========================================
echo   RELEASE BUILD USPEL
echo ==========================================
echo.
echo Verzija:
echo %VERSION%
echo.
echo APK:
echo %OUTPUT_APK%
echo.
echo SHA-256:
echo %OUTPUT_HASH%
echo.

explorer "%ROOT%release"

pause
exit /b 0

:rollback
echo.
echo Build ni uspel. Obnavljam prejsnji build.gradle ...

if exist "%GRADLE_BACKUP%" (
    copy /Y "%GRADLE_BACKUP%" "%GRADLE_FILE%" >nul
    del /F /Q "%GRADLE_BACKUP%" >nul
    echo Prejsnja verzija build.gradle je obnovljena.
)

goto :error

:error
echo.
echo ==========================================
echo   RELEASE BUILD NI USPEL
echo ==========================================
echo.
pause
exit /b 1