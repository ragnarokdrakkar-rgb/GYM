param(
    [ValidateSet('Source', 'Android')]
    [string]$Phase = 'Source',

    [string]$IndexFile,

    [string]$ExpectedVersion
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Fail-Guard {
    param([string]$Message)

    Write-Host ''
    Write-Host ('RELEASE GUARD BLOKADA: ' + $Message) -ForegroundColor Red
    exit 1
}

function Assert-File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        if ([string]::IsNullOrWhiteSpace($Label)) {
            $Label = $Path
        }

        Fail-Guard "Manjka datoteka: $Label"
    }
}

function Assert-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        if ([string]::IsNullOrWhiteSpace($Label)) {
            $Label = $Path
        }

        Fail-Guard "Manjka mapa: $Label"
    }
}

function Assert-Contains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content,

        [Parameter(Mandatory = $true)]
        [string]$Token,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not $Content.Contains($Token)) {
        Fail-Guard "$Label manjka: $Token"
    }
}

function Assert-Regex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content,

        [Parameter(Mandatory = $true)]
        [string]$Pattern,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not [regex]::IsMatch($Content, $Pattern)) {
        Fail-Guard "$Label ni bil najden."
    }
}

function Test-JavaScriptSyntax {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    & node.exe --check $Path

    if ($LASTEXITCODE -ne 0) {
        Fail-Guard "JavaScript sintaksa ni veljavna: $Path"
    }
}

function Get-Sha256FromBytes {
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$Bytes
    )

    $Sha = [System.Security.Cryptography.SHA256]::Create()

    try {
        return (
            [System.BitConverter]::ToString(
                $Sha.ComputeHash($Bytes)
            ).Replace('-', '').ToLowerInvariant()
        )
    }
    finally {
        $Sha.Dispose()
    }
}

function Get-FileSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return (
        Get-FileHash -LiteralPath $Path -Algorithm SHA256
    ).Hash.ToLowerInvariant()
}

function Assert-SameFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Left,

        [Parameter(Mandatory = $true)]
        [string]$Right,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Assert-File -Path $Left -Label $Left
    Assert-File -Path $Right -Label $Right

    $LeftHash = Get-FileSha256 -Path $Left
    $RightHash = Get-FileSha256 -Path $Right

    if ($LeftHash -ne $RightHash) {
        Fail-Guard "$Label se ne ujema. Levo: $LeftHash Desno: $RightHash"
    }
}

function Get-GradleVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$GradleContent
    )

    $VersionNameMatch = [regex]::Match(
        $GradleContent,
        'versionName\s+"([^"]+)"'
    )

    $VersionCodeMatch = [regex]::Match(
        $GradleContent,
        'versionCode\s+(\d+)'
    )

    if (-not $VersionNameMatch.Success) {
        Fail-Guard 'V build.gradle ni versionName.'
    }

    if (-not $VersionCodeMatch.Success) {
        Fail-Guard 'V build.gradle ni versionCode.'
    }

    $VersionCode = [int]$VersionCodeMatch.Groups[1].Value

    if ($VersionCode -le 0) {
        Fail-Guard 'Android versionCode mora biti vecji od 0.'
    }

    return @{
        Name = $VersionNameMatch.Groups[1].Value
        Code = $VersionCode
    }
}

function Invoke-SourceGuard {
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        Fail-Guard 'node.exe ni bil najden.'
    }

    $SourceRelativePaths = @(
        'src\app\ui-shell.js',
        'src\app\workout-model.js',
        'src\app\profile-strength.js',
        'src\app\workout-ui.js',
        'src\app\gym-session-core.js',
        'src\app\v6-core.js',
        'src\app\workout-runtime.js',
        'src\app\analytics-tools.js',
        'src\app\main.js'
    )

    $SourceFiles = @(
        $SourceRelativePaths |
        ForEach-Object { Join-Path $ProjectRoot $_ }
    )

    $RuntimeFile = Join-Path $ProjectRoot 'js\app.js'
    $RootIndex = Join-Path $ProjectRoot 'index.html'
    $CssFile = Join-Path $ProjectRoot 'css\app.css'
    $BundleFile = Join-Path $ProjectRoot 'build-app-bundle.ps1'
    $PrepareFile = Join-Path $ProjectRoot 'prepare-android.ps1'
    $BuildFile = Join-Path $ProjectRoot 'build-release.bat'
    $PublishFile = Join-Path $ProjectRoot 'publish-release.ps1'
    $AuditFile = Join-Path $ProjectRoot 'audit-app-code.js'
    $PackageFile = Join-Path $ProjectRoot 'package.json'
    $GradleFile = Join-Path $ProjectRoot 'android\app\build.gradle'
    $ManifestFile = Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml'
    $MainActivityFile = Join-Path $ProjectRoot 'android\app\src\main\java\com\kemal\workouttracker\MainActivity.java'
    $SoundFile = Join-Path $ProjectRoot 'android\app\src\main\res\raw\workout_rest.wav'

    $InjectionRelativePaths = @(
        'js\core\backup.js',
        'js\app-ui.js',
        'js\app-update.js',
        'js\rest-native-notifications.js',
        'js\ui-safe-v1.js',
        'js\workout\set-log.js'
    )

    $InjectionFiles = @(
        $InjectionRelativePaths |
        ForEach-Object { Join-Path $ProjectRoot $_ }
    )

    foreach ($Path in @(
        $RuntimeFile,
        $RootIndex,
        $CssFile,
        $BundleFile,
        $PrepareFile,
        $BuildFile,
        $PublishFile,
        $AuditFile,
        $PackageFile,
        $GradleFile,
        $ManifestFile,
        $MainActivityFile,
        $SoundFile
    ) + $SourceFiles + $InjectionFiles) {
        Assert-File -Path $Path -Label $Path
    }

    if ((Get-Item -LiteralPath $SoundFile).Length -lt 1024) {
        Fail-Guard 'Native timer zvok workout_rest.wav je prazen ali premajhen.'
    }

    foreach ($JsFile in @(
        $RuntimeFile,
        (Join-Path $ProjectRoot 'sw.js')
    ) + $SourceFiles + $InjectionFiles) {
        Assert-File -Path $JsFile -Label $JsFile
        Test-JavaScriptSyntax -Path $JsFile
    }

    $Combined = ''

    foreach ($SourceFile in $SourceFiles) {
        $Combined += [System.IO.File]::ReadAllText($SourceFile)
    }

    $CombinedBytes = $Utf8NoBom.GetBytes($Combined)
    $RuntimeBytes = [System.IO.File]::ReadAllBytes($RuntimeFile)

    if ($CombinedBytes.Length -ne $RuntimeBytes.Length) {
        Fail-Guard "Source bundle in js/app.js nimata enake dolzine. Source: $($CombinedBytes.Length), runtime: $($RuntimeBytes.Length)"
    }

    $CombinedHash = Get-Sha256FromBytes -Bytes $CombinedBytes
    $RuntimeHash = Get-Sha256FromBytes -Bytes $RuntimeBytes

    if ($CombinedHash -ne $RuntimeHash) {
        Fail-Guard "Source bundle ni bajtno enak js/app.js. Source: $CombinedHash Runtime: $RuntimeHash"
    }

    $IndexContent = [System.IO.File]::ReadAllText($RootIndex)
    $RuntimeTag = '<script src="js/app.js"></script>'
    $RuntimeTagCount = [regex]::Matches(
        $IndexContent,
        [regex]::Escape($RuntimeTag)
    ).Count

    if ($RuntimeTagCount -ne 1) {
        Fail-Guard "index.html mora vsebovati tocno en js/app.js tag. Najdeno: $RuntimeTagCount"
    }

    foreach ($ForbiddenToken in @(
        'src/app/',
        'js/workout/engine.js',
        'js/app-tail.js'
    )) {
        if ($IndexContent.Contains($ForbiddenToken)) {
            Fail-Guard "index.html vsebuje prepovedan runtime vir: $ForbiddenToken"
        }
    }

    foreach ($RequiredToken in @(
        'id="page-workout"',
        'id="page-gymlog"',
        'id="page-cycle"',
        'id="page-stats"',
        'id="page-bodyweight"',
        'id="page-tools"',
        'id="day-content"',
        'id="st-b"',
        'id="strength-chart"',
        'id="sess-hist-content"'
    )) {
        Assert-Contains `
            -Content $IndexContent `
            -Token $RequiredToken `
            -Label 'index.html zaslon'
    }

    $AppContent = [System.IO.File]::ReadAllText($RuntimeFile)

    $RequiredFunctionPatterns = @(
        @{ Name = 'showPage'; Pattern = '\bfunction\s+showPage\s*\(' },
        @{ Name = 'showProgressPage'; Pattern = '\bfunction\s+showProgressPage\s*\(' },
        @{ Name = 'showDay'; Pattern = '\bfunction\s+showDay\s*\(' },
        @{ Name = 'renderEx'; Pattern = '\bfunction\s+renderEx\s*\(' },
        @{ Name = 'tgSet'; Pattern = '\bfunction\s+tgSet\s*\(' },
        @{ Name = 'startT'; Pattern = '\bfunction\s+startT\s*\(' },
        @{ Name = 'stopT'; Pattern = '\bfunction\s+stopT\s*\(' },
        @{ Name = 'toggleSess'; Pattern = '\b(?:async\s+)?function\s+toggleSess\s*\(' },
        @{ Name = 'restoreSession'; Pattern = '\bfunction\s+restoreSession\s*\(' },
        @{ Name = 'restoreTimer'; Pattern = '\bfunction\s+restoreTimer\s*\(' },
        @{ Name = 'renderSessHist'; Pattern = '\bfunction\s+renderSessHist\s*\(' },
        @{ Name = 'renderStrengthChart'; Pattern = '\bfunction\s+renderStrengthChart\s*\(' },
        @{ Name = 'renderBW'; Pattern = '\bfunction\s+renderBW\s*\(' },
        @{ Name = 'renderMeas'; Pattern = '\bfunction\s+renderMeas\s*\(' },
        @{ Name = 'exportData'; Pattern = '\b(?:async\s+)?function\s+exportData\s*\(' }
    )

    foreach ($RequiredFunction in $RequiredFunctionPatterns) {
        Assert-Regex `
            -Content $AppContent `
            -Pattern $RequiredFunction.Pattern `
            -Label ("Funkcija " + $RequiredFunction.Name)
    }

    foreach ($RequiredToken in @(
        "const LS_SESS='wt_active_sess';",
        'restoreSession();restoreTimer();',
        'runSelfTestsV6(true)',
        'initP1();'
    )) {
        Assert-Contains `
            -Content $AppContent `
            -Token $RequiredToken `
            -Label 'js/app.js varnostna inicializacija'
    }

    $RestScript = [System.IO.File]::ReadAllText(
        (Join-Path $ProjectRoot 'js\rest-native-notifications.js')
    )

    foreach ($RequiredToken in @(
        "const CHANNEL_SOUND = 'workout_rest.wav';",
        "getPlugin('LocalNotifications')",
        "getPlugin('Haptics')",
        'originalStartT',
        'originalStopT',
        'removeDeliveredRestNotification'
    )) {
        Assert-Contains `
            -Content $RestScript `
            -Token $RequiredToken `
            -Label 'Native timer skripta'
    }

    $PrepareContent = [System.IO.File]::ReadAllText($PrepareFile)

    foreach ($RequiredToken in @(
        'window.__WT_ANDROID_APP__ = true;',
        'js/app-update.js',
        'js/rest-native-notifications.js',
        'js/ui-safe-v1.js',
        'js/workout/set-log.js'
    )) {
        Assert-Contains `
            -Content $PrepareContent `
            -Token $RequiredToken `
            -Label 'prepare-android.ps1'
    }

    $Package = Get-Content -LiteralPath $PackageFile -Raw |
        ConvertFrom-Json

    foreach ($DependencyName in @(
        '@capacitor/android',
        '@capacitor/app',
        '@capacitor/core',
        '@capacitor/haptics',
        '@capacitor/local-notifications'
    )) {
        $Dependency = $Package.dependencies.PSObject.Properties[$DependencyName]

        if (-not $Dependency -or [string]::IsNullOrWhiteSpace([string]$Dependency.Value)) {
            Fail-Guard "package.json nima odvisnosti: $DependencyName"
        }
    }

    $GradleContent = [System.IO.File]::ReadAllText($GradleFile)
    $GradleVersion = Get-GradleVersion -GradleContent $GradleContent

    foreach ($RequiredToken in @(
        'namespace = "com.kemal.workouttracker"',
        'applicationId "com.kemal.workouttracker"',
        'signingConfig signingConfigs.release'
    )) {
        Assert-Contains `
            -Content $GradleContent `
            -Token $RequiredToken `
            -Label 'android/app/build.gradle'
    }

    $MainActivityContent = [System.IO.File]::ReadAllText($MainActivityFile)

    foreach ($RequiredToken in @(
        'package com.kemal.workouttracker;',
        'extends BridgeActivity'
    )) {
        Assert-Contains `
            -Content $MainActivityContent `
            -Token $RequiredToken `
            -Label 'MainActivity.java'
    }

    $BuildContent = [System.IO.File]::ReadAllText($BuildFile)

    foreach ($RequiredToken in @(
        'set "GUARD_SCRIPT=%ROOT%release-guard.ps1"',
        '-Phase Source',
        '-Phase Android',
        '-ExpectedVersion "%VERSION%"'
    )) {
        Assert-Contains `
            -Content $BuildContent `
            -Token $RequiredToken `
            -Label 'build-release.bat guard povezava'
    }

    $PublishContent = [System.IO.File]::ReadAllText($PublishFile)

    foreach ($RequiredToken in @(
        'Confirm-UntrackedFiles',
        'Reset-Staging',
        'STABLE\{0}',
        "release-guard.ps1",
        "audit-app-code.js"
    )) {
        Assert-Contains `
            -Content $PublishContent `
            -Token $RequiredToken `
            -Label 'publish-release.ps1 varnost'
    }

    Write-Host ''
    Write-Host 'Zaganjam staticni Code Audit ...' -ForegroundColor Cyan

    & node.exe $AuditFile --ci

    if ($LASTEXITCODE -ne 0) {
        Fail-Guard "Staticni Code Audit ni uspel. Exit code: $LASTEXITCODE"
    }
    Write-Host ''
    Write-Host 'RELEASE GUARD - SOURCE: OK' -ForegroundColor Green
    Write-Host "Bundle SHA-256: $RuntimeHash"
    Write-Host "Android verzija v projektu: $($GradleVersion.Name) / code $($GradleVersion.Code)"
    Write-Host 'Trening, Moc, Gym Log, timer, session recovery in backup jedro: prisotno'
}

function Invoke-AndroidGuard {
    if ([string]::IsNullOrWhiteSpace($IndexFile)) {
        Fail-Guard 'Za Android phase manjka -IndexFile.'
    }

    if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
        Fail-Guard 'Za Android phase manjka -ExpectedVersion.'
    }

    $ResolvedIndex = [System.IO.Path]::GetFullPath($IndexFile)
    Assert-File -Path $ResolvedIndex -Label 'pripravljeni Android index.html'

    $WwwRoot = Split-Path -Parent $ResolvedIndex
    $AndroidIndex = [System.IO.File]::ReadAllText($ResolvedIndex)
    $AndroidServiceWorker = Join-Path $WwwRoot 'sw.js'

    if (Test-Path -LiteralPath $AndroidServiceWorker) {
        Fail-Guard 'Android WWW ne sme vsebovati sw.js.'
    }

    foreach ($RequiredToken in @(
        'window.__WT_ANDROID_APP__ = true;',
        'navigator.serviceWorker.getRegistrations()',
        'id="page-workout"',
        'id="page-gymlog"',
        'id="page-stats"',
        'id="page-tools"',
        'id="day-content"',
        'id="strength-chart"'
    )) {
        Assert-Contains `
            -Content $AndroidIndex `
            -Token $RequiredToken `
            -Label 'Android index.html'
    }

    if (
        [regex]::IsMatch(
            $AndroidIndex,
            '<link\s+rel=["'']manifest["'']',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    ) {
        Fail-Guard 'Android index.html se vedno vsebuje manifest link.'
    }

    foreach ($ForbiddenToken in @(
        'src/app/',
        'js/workout/engine.js',
        'js/app-tail.js'
    )) {
        if ($AndroidIndex.Contains($ForbiddenToken)) {
            Fail-Guard "Android index vsebuje prepovedan runtime vir: $ForbiddenToken"
        }
    }

    $RequiredScriptSources = @(
        'js/core/backup.js',
        'js/app-ui.js',
        'js/app.js',
        'js/app-update.js',
        'js/rest-native-notifications.js',
        'js/ui-safe-v1.js',
        'js/workout/set-log.js'
    )

    foreach ($ScriptSource in $RequiredScriptSources) {
        $TagPattern = '<script\s+src=["'']' +
            [regex]::Escape($ScriptSource) +
            '["'']\s*></script>'

        $Count = [regex]::Matches(
            $AndroidIndex,
            $TagPattern,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        ).Count

        if ($Count -ne 1) {
            Fail-Guard "Android index mora vsebovati tocno en $ScriptSource. Najdeno: $Count"
        }
    }

    $ScriptPositions = @(
        $AndroidIndex.IndexOf('js/app.js'),
        $AndroidIndex.IndexOf('js/app-update.js'),
        $AndroidIndex.IndexOf('js/rest-native-notifications.js'),
        $AndroidIndex.IndexOf('js/ui-safe-v1.js'),
        $AndroidIndex.IndexOf('js/workout/set-log.js')
    )

    for ($i = 1; $i -lt $ScriptPositions.Count; $i++) {
        if (
            $ScriptPositions[$i - 1] -lt 0 -or
            $ScriptPositions[$i] -lt 0 -or
            $ScriptPositions[$i - 1] -ge $ScriptPositions[$i]
        ) {
            Fail-Guard 'Android JavaScript vrstni red ni pravilen.'
        }
    }

    $CopyPairs = @(
        @{ Source = 'js\core\backup.js'; Www = 'js\core\backup.js' },
        @{ Source = 'js\core\state-storage.js'; Www = 'js\core\state-storage.js' },
        @{ Source = 'js\app-ui.js'; Www = 'js\app-ui.js' },
        @{ Source = 'js\app.js'; Www = 'js\app.js' },
        @{ Source = 'js\app-update.js'; Www = 'js\app-update.js' },
        @{ Source = 'js\rest-native-notifications.js'; Www = 'js\rest-native-notifications.js' },
        @{ Source = 'js\ui-safe-v1.js'; Www = 'js\ui-safe-v1.js' },
        @{ Source = 'js\workout\set-log.js'; Www = 'js\workout\set-log.js' },
        @{ Source = 'css\app.css'; Www = 'css\app.css' }
    )

    foreach ($Pair in $CopyPairs) {
        Assert-SameFile `
            -Left (Join-Path $ProjectRoot $Pair.Source) `
            -Right (Join-Path $WwwRoot $Pair.Www) `
            -Label ("Android WWW kopija " + $Pair.Www)
    }

    $GradleFile = Join-Path $ProjectRoot 'android\app\build.gradle'
    Assert-File -Path $GradleFile -Label 'android/app/build.gradle'

    $GradleContent = [System.IO.File]::ReadAllText($GradleFile)
    $GradleVersion = Get-GradleVersion -GradleContent $GradleContent

    if ($GradleVersion.Name -cne $ExpectedVersion) {
        Fail-Guard "Android versionName je $($GradleVersion.Name), pricakovano pa $ExpectedVersion."
    }

    $SoundFile = Join-Path $ProjectRoot 'android\app\src\main\res\raw\workout_rest.wav'
    Assert-File -Path $SoundFile -Label 'workout_rest.wav'

    if ((Get-Item -LiteralPath $SoundFile).Length -lt 1024) {
        Fail-Guard 'Native timer zvok je premajhen.'
    }

    Write-Host ''
    Write-Host 'RELEASE GUARD - ANDROID: OK' -ForegroundColor Green
    Write-Host "Android verzija: $($GradleVersion.Name) / code $($GradleVersion.Code)"
    Write-Host 'En runtime js/app.js + vse Android injekcije: OK'
    Write-Host 'Native timer zvok in kopirane WWW datoteke: OK'
}

try {
    if ($Phase -eq 'Source') {
        Invoke-SourceGuard
    }
    elseif ($Phase -eq 'Android') {
        Invoke-AndroidGuard
    }
}
catch {
    Fail-Guard $_.Exception.Message
}
