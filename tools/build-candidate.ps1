$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$version = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
function Assert-NativeExit([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed ($LASTEXITCODE)" } }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\build-app-bundle.ps1' -Quiet
Assert-NativeExit 'Bundle'
& npm.cmd test
Assert-NativeExit 'Tests'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\release-guard.ps1' -Phase Source
Assert-NativeExit 'Source guard'
$wwwRoot = Join-Path $projectRoot 'www'
New-Item -ItemType Directory -Path $wwwRoot -Force | Out-Null
foreach ($file in @('index.html','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png')) {
    if (Test-Path -LiteralPath $file) { Copy-Item -LiteralPath $file -Destination (Join-Path $wwwRoot $file) -Force }
}
foreach ($dir in @('css','js','assets','vendor')) {
    if (Test-Path -LiteralPath $dir) {
        $destination = Join-Path $wwwRoot $dir
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Get-ChildItem -LiteralPath $dir | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force }
    }
}
# Only the generated Android copy is adapted; source HTML remains untouched.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\prepare-android.ps1' -IndexFile (Join-Path $wwwRoot 'index.html')
Assert-NativeExit 'Android preparation'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\release-guard.ps1' -Phase Android -IndexFile (Join-Path $wwwRoot 'index.html') -ExpectedVersion $version
Assert-NativeExit 'Android guard'
& npx.cmd cap copy android
Assert-NativeExit 'Capacitor copy'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Push-Location -LiteralPath (Join-Path $projectRoot 'android')
try {
    & .\gradlew.bat --offline assembleRelease
    Assert-NativeExit 'Signed Android build'
} finally { Pop-Location }
$releaseRoot = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$apk = Join-Path $releaseRoot "Workout-Tracker-v$version.apk"
Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination $apk -Force
Get-Item -LiteralPath $apk | Select-Object FullName,Length,LastWriteTime
Get-FileHash -LiteralPath $apk -Algorithm SHA256
Write-Host 'Local APK prepared. This script does not publish a GitHub release.'
