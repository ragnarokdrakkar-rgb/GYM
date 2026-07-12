$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

$AndroidDirectory = Join-Path $Root 'android'
$GradleFile = Join-Path $AndroidDirectory 'app\build.gradle'
$StringsFile = Join-Path $AndroidDirectory 'app\src\main\res\values\strings.xml'
$PrepareScript = Join-Path $Root 'prepare-android.ps1'
$WwwDirectory = Join-Path $Root 'www'
$ReleaseDirectory = Join-Path $Root 'release'
$JavaHome = 'C:\Program Files\Android\Android Studio\jbr'

$BackupDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
    'WorkoutTrackerTimerTest-' + [guid]::NewGuid().ToString('N')
)

$GradleBackup = Join-Path $BackupDirectory 'build.gradle'
$StringsBackup = Join-Path $BackupDirectory 'strings.xml'

function Stop-WithMessage {
    param([string]$Message)

    Write-Host ''
    Write-Host ('NAPAKA: ' + $Message) -ForegroundColor Red
    exit 1
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    & $File @Arguments
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    if ($ExitCode -ne 0) {
        throw "$FailureMessage Exit code: $ExitCode"
    }
}

$RequiredFiles = @(
    (Join-Path $Root 'index.html'),
    (Join-Path $Root 'js\app-update.js'),
    (Join-Path $Root 'js\rest-native-notifications.js'),
    $GradleFile,
    $StringsFile,
    $PrepareScript,
    (Join-Path $JavaHome 'bin\java.exe')
)

foreach ($File in $RequiredFiles) {
    if (-not (Test-Path -LiteralPath $File)) {
        Stop-WithMessage "Manjka datoteka: $File"
    }
}

Write-Host ''
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ' WORKOUT TRACKER - TIMER TEST APK' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Ta APK se namesti loceno kot Workout Tracker TEST.'
Write-Host 'Stabilna aplikacija 1.0.12 in njeni podatki ostanejo nedotaknjeni.'
Write-Host ''

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

Copy-Item -LiteralPath $GradleFile -Destination $GradleBackup -Force
Copy-Item -LiteralPath $StringsFile -Destination $StringsBackup -Force

try {
    Write-Host '[1/5] Pripravljam WWW mapo ...'

    if (Test-Path -LiteralPath $WwwDirectory) {
        Remove-Item -LiteralPath $WwwDirectory -Recurse -Force
    }

    New-Item -ItemType Directory -Path $WwwDirectory -Force | Out-Null

    Copy-Item -LiteralPath (Join-Path $Root 'index.html') `
        -Destination (Join-Path $WwwDirectory 'index.html') `
        -Force

    $OptionalFiles = @(
        'manifest.json',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png'
    )

    foreach ($Name in $OptionalFiles) {
        $Source = Join-Path $Root $Name

        if (Test-Path -LiteralPath $Source) {
            Copy-Item -LiteralPath $Source `
                -Destination (Join-Path $WwwDirectory $Name) `
                -Force
        }
    }

    $OptionalDirectories = @(
        'css',
        'js',
        'assets',
        'vendor'
    )

    foreach ($Name in $OptionalDirectories) {
        $Source = Join-Path $Root $Name
        $Destination = Join-Path $WwwDirectory $Name

        if (Test-Path -LiteralPath $Source) {
            Copy-Item -LiteralPath $Source `
                -Destination $Destination `
                -Recurse `
                -Force
        }
    }

    & powershell.exe `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $PrepareScript `
        -IndexFile (Join-Path $WwwDirectory 'index.html')

    if ($LASTEXITCODE -ne 0) {
        throw 'prepare-android.ps1 ni uspel.'
    }

    $ServiceWorker = Join-Path $WwwDirectory 'sw.js'

    if (Test-Path -LiteralPath $ServiceWorker) {
        Remove-Item -LiteralPath $ServiceWorker -Force
    }

    Write-Host '[2/5] Capacitor sync ...'

    Invoke-Native `
        -File 'npx.cmd' `
        -Arguments @('cap', 'sync', 'android') `
        -FailureMessage 'Capacitor sync ni uspel.'

    Write-Host '[3/5] Ustvarjam loceno TEST aplikacijo ...'

    $GradleContent = [System.IO.File]::ReadAllText($GradleFile)

    $ApplicationIdPattern =
        'applicationId\s+"com\.kemal\.workouttracker"'

    if (
        [regex]::Matches(
            $GradleContent,
            $ApplicationIdPattern
        ).Count -ne 1
    ) {
        throw 'applicationId v build.gradle ni bil najden natanko enkrat.'
    }

    $GradleContent = [regex]::Replace(
        $GradleContent,
        $ApplicationIdPattern,
        'applicationId "com.kemal.workouttracker.timertest"',
        1
    )

    $VersionNamePattern = 'versionName\s+"([^"]+)"'
    $VersionMatch = [regex]::Match(
        $GradleContent,
        $VersionNamePattern
    )

    if (-not $VersionMatch.Success) {
        throw 'versionName v build.gradle ni bil najden.'
    }

    $BaseVersion = $VersionMatch.Groups[1].Value

    $GradleContent = [regex]::Replace(
        $GradleContent,
        $VersionNamePattern,
        ('versionName "' + $BaseVersion + '-timer-test"'),
        1
    )

    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        $GradleFile,
        $GradleContent,
        $Utf8NoBom
    )

    $StringsContent =
        [System.IO.File]::ReadAllText($StringsFile)

    $StringsContent = $StringsContent.Replace(
        '<string name="app_name">Workout Tracker</string>',
        '<string name="app_name">Workout Tracker TEST</string>'
    )

    $StringsContent = $StringsContent.Replace(
        '<string name="title_activity_main">Workout Tracker</string>',
        '<string name="title_activity_main">Workout Tracker TEST</string>'
    )

    $StringsContent = $StringsContent.Replace(
        '<string name="package_name">com.kemal.workouttracker</string>',
        '<string name="package_name">com.kemal.workouttracker.timertest</string>'
    )

    $StringsContent = $StringsContent.Replace(
        '<string name="custom_url_scheme">com.kemal.workouttracker</string>',
        '<string name="custom_url_scheme">com.kemal.workouttracker.timertest</string>'
    )

    [System.IO.File]::WriteAllText(
        $StringsFile,
        $StringsContent,
        $Utf8NoBom
    )

    Write-Host '[4/5] Gradle podpisani TEST build ...'

    $env:JAVA_HOME = $JavaHome
    $env:PATH = (Join-Path $JavaHome 'bin') + ';' + $env:PATH

    $GradleWrapper =
        Join-Path $AndroidDirectory 'gradlew.bat'

    Push-Location $AndroidDirectory

    try {
        Invoke-Native `
            -File $GradleWrapper `
            -Arguments @('assembleRelease') `
            -FailureMessage 'Gradle TEST build ni uspel.'
    } finally {
        Pop-Location
    }

    Write-Host '[5/5] Kopiram TEST APK ...'

    $SourceApk = Join-Path $AndroidDirectory `
        'app\build\outputs\apk\release\app-release.apk'

    if (-not (Test-Path -LiteralPath $SourceApk)) {
        throw "Zgrajeni APK ni najden: $SourceApk"
    }

    New-Item -ItemType Directory `
        -Path $ReleaseDirectory `
        -Force | Out-Null

    $OutputApk = Join-Path $ReleaseDirectory `
        'Workout-Tracker-TIMER-TEST.apk'

    $OutputHash = Join-Path $ReleaseDirectory `
        'Workout-Tracker-TIMER-TEST-SHA256.txt'

    Copy-Item -LiteralPath $SourceApk `
        -Destination $OutputApk `
        -Force

    & certutil.exe -hashfile $OutputApk SHA256 |
        Out-File -LiteralPath $OutputHash -Encoding ascii

    if ($LASTEXITCODE -ne 0) {
        throw 'SHA-256 ni bilo mogoce izracunati.'
    }

    Write-Host ''
    Write-Host '==========================================' -ForegroundColor Green
    Write-Host ' TIMER TEST APK JE USPEL' -ForegroundColor Green
    Write-Host '==========================================' -ForegroundColor Green
    Write-Host ''
    Write-Host "APK: $OutputApk"
    Write-Host "Verzija: $BaseVersion-timer-test"
    Write-Host 'Paket: com.kemal.workouttracker.timertest'
    Write-Host ''
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    Stop-WithMessage 'TIMER TEST build ni uspel.'
} finally {
    if (Test-Path -LiteralPath $GradleBackup) {
        Copy-Item -LiteralPath $GradleBackup `
            -Destination $GradleFile `
            -Force

        Remove-Item -LiteralPath $GradleBackup -Force
    }

    if (Test-Path -LiteralPath $StringsBackup) {
        Copy-Item -LiteralPath $StringsBackup `
            -Destination $StringsFile `
            -Force
    }

    if (Test-Path -LiteralPath $BackupDirectory) {
        Remove-Item -LiteralPath $BackupDirectory -Recurse -Force
    }

    Write-Host 'Originalni build.gradle in strings.xml sta obnovljena.'
}
