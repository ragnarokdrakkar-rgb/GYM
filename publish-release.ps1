$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

$Repository = 'ragnarokdrakkar-rgb/GYM'
$Branch = 'main'
$BuildFile = Join-Path $ProjectRoot 'build-release.bat'
$ReleaseDirectory = Join-Path $ProjectRoot 'release'

# Poisci GitHub CLI tudi takrat, ko nova PATH nastavitev ni vidna PowerShellu.
$GhExe = $null
$GhCommand = Get-Command gh.exe -ErrorAction SilentlyContinue

if ($GhCommand) {
    $GhExe = $GhCommand.Source
}

if (-not $GhExe) {
    $GhCandidates = @(
        'C:\Program Files\GitHub CLI\gh.exe',
        (Join-Path $env:LOCALAPPDATA 'Programs\GitHub CLI\gh.exe'),
        (Join-Path $env:ProgramFiles 'GitHub CLI\gh.exe')
    )

    foreach ($Candidate in $GhCandidates) {
        if ($Candidate -and (Test-Path -LiteralPath $Candidate)) {
            $GhExe = $Candidate
            break
        }
    }
}

if (-not $GhExe) {
    Write-Host ''
    Write-Host 'NAPAKA: GitHub CLI gh.exe ni bil najden.' -ForegroundColor Red
    Write-Host 'Preveri z ukazom: where gh'
    exit 1
}

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
        Stop-WithMessage "$FailureMessage Exit code: $ExitCode"
    }
}

function Get-NativeLines {
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
    $StandardErrorFile = [System.IO.Path]::GetTempFileName()

    try {
        # Zajemi SAMO stdout. Git opozorila iz stderr ne smejo postati
        # imena datotek za staging.
        $Output = @(& $File @Arguments 2> $StandardErrorFile)
        $ExitCode = $LASTEXITCODE

        $StandardError = @()

        if (Test-Path -LiteralPath $StandardErrorFile) {
            $StandardError = @(
                Get-Content -LiteralPath $StandardErrorFile -ErrorAction SilentlyContinue |
                ForEach-Object { [string]$_ } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
            )
        }

        if ($ExitCode -ne 0) {
            if ($StandardError.Count -gt 0) {
                Write-Host ''
                $StandardError | ForEach-Object {
                    Write-Host $_ -ForegroundColor DarkYellow
                }
            }

            Stop-WithMessage "$FailureMessage Exit code: $ExitCode"
        }

        return @(
            $Output |
            ForEach-Object { [string]$_ } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )
    }
    finally {
        $ErrorActionPreference = $PreviousPreference

        if (Test-Path -LiteralPath $StandardErrorFile) {
            Remove-Item -LiteralPath $StandardErrorFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-NativeSuccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    & $File @Arguments *> $null
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    return ($ExitCode -eq 0)
}

function Test-ReleaseExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Tag
    )

    return Test-NativeSuccess `
        -File $script:GhExe `
        -Arguments @('release', 'view', $Tag, '--repo', $Repository)
}

function Get-ChangedFiles {
    $Files = @()

    $Files += Get-NativeLines `
        -File 'git' `
        -Arguments @('diff', '--name-only', '--no-renames') `
        -FailureMessage 'Branje nestaged Git sprememb ni uspelo.'

    $Files += Get-NativeLines `
        -File 'git' `
        -Arguments @('diff', '--cached', '--name-only', '--no-renames') `
        -FailureMessage 'Branje staged Git sprememb ni uspelo.'

    $Files += Get-NativeLines `
        -File 'git' `
        -Arguments @('ls-files', '--others', '--exclude-standard') `
        -FailureMessage 'Branje novih Git datotek ni uspelo.'

    return @(
        $Files |
        ForEach-Object { ([string]$_).Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Sort-Object -Unique
    )
}

function Get-UntrackedFiles {
    return @(
        Get-NativeLines `
            -File 'git' `
            -Arguments @('ls-files', '--others', '--exclude-standard') `
            -FailureMessage 'Branje novih Git datotek ni uspelo.' |
        ForEach-Object { ([string]$_).Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Sort-Object -Unique
    )
}

function Get-StagedFiles {
    return @(
        Get-NativeLines `
            -File 'git' `
            -Arguments @('diff', '--cached', '--name-only', '--no-renames') `
            -FailureMessage 'Branje staged Git datotek ni uspelo.' |
        ForEach-Object { ([string]$_).Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Sort-Object -Unique
    )
}

function Get-UnsafeFiles {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$Files,

        [string[]]$UntrackedFiles = @()
    )

    $ForbiddenPatterns = @(
        '(^|/)node_modules(/|$)',
        '(^|/)www(/|$)',
        '(^|/)release(/|$)',
        '(^|/)STABLE(/|$)',
        '(^|/)\.idea(/|$)',
        '(^|/)\.git(/|$)',
        '(^|/)android/\.gradle(/|$)',
        '(^|/)android/app/build(/|$)',
        '(^|/)local\.properties$',
        '(^|/)keystore\.properties$',
        '(^|/)\.env($|\.)',
        '\.jks$',
        '\.keystore$',
        '\.p12$',
        '\.pfx$',
        '\.pem$',
        '\.key$',
        '\.apk$',
        '\.aab$',
        '\.bak$',
        '\.tmp$',
        '\.log$',
        '^(git|del|cd)$'
    )

    $AllowedRootFilesWithoutExtension = @(
        'LICENSE',
        'README',
        'Dockerfile',
        '.gitignore',
        '.gitattributes'
    )

    $UntrackedLookup = @{}

    foreach ($UntrackedFile in $UntrackedFiles) {
        $UntrackedLookup[$UntrackedFile.Replace('\', '/')] = $true
    }

    $Unsafe = @()

    foreach ($File in $Files) {
        $Normalized = $File.Replace('\', '/')
        $Blocked = $false

        foreach ($Pattern in $ForbiddenPatterns) {
            if ($Normalized -match $Pattern) {
                $Unsafe += $File
                $Blocked = $true
                break
            }
        }

        if ($Blocked) {
            continue
        }

        if ($UntrackedLookup.ContainsKey($Normalized)) {
            $IsRootFile = ($Normalized -notmatch '/')
            $Extension = [System.IO.Path]::GetExtension($Normalized)

            if (
                $IsRootFile -and
                [string]::IsNullOrWhiteSpace($Extension) -and
                $AllowedRootFilesWithoutExtension -notcontains $Normalized
            ) {
                $Unsafe += $File
            }
        }
    }

    return @($Unsafe | Sort-Object -Unique)
}

function Show-FileList {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,

        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$Files,

        [string[]]$UntrackedFiles = @()
    )

    Write-Host ''
    Write-Host $Title -ForegroundColor Yellow

    if ($Files.Count -eq 0) {
        Write-Host '(ni sprememb)'
        return
    }

    $UntrackedLookup = @{}

    foreach ($UntrackedFile in $UntrackedFiles) {
        $UntrackedLookup[$UntrackedFile.Replace('\', '/')] = $true
    }

    foreach ($File in $Files) {
        $Normalized = $File.Replace('\', '/')

        if ($UntrackedLookup.ContainsKey($Normalized)) {
            Write-Host ("[NOVA] " + $File) -ForegroundColor Magenta
        } else {
            Write-Host ("       " + $File)
        }
    }
}

function Reset-Staging {
    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    & git reset --quiet
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    if ($ExitCode -ne 0) {
        Stop-WithMessage 'Git staginga ni bilo mogoce ponastaviti.'
    }
}

function Confirm-UntrackedFiles {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$UntrackedFiles
    )

    if ($UntrackedFiles.Count -eq 0) {
        return
    }

    Write-Host ''
    Write-Host 'NOVE DATOTEKE ZAHTEVAJO DODATNO POTRDITEV.' -ForegroundColor Magenta
    Write-Host 'Za vsako novo datoteko vpisi njeno TOCNO pot.' -ForegroundColor Magenta

    foreach ($File in $UntrackedFiles) {
        Write-Host ''
        $TypedPath = Read-Host "Potrdi novo datoteko: $File"

        if ($TypedPath -cne $File) {
            Stop-WithMessage "Nova datoteka '$File' ni bila potrjena. Nic ni bilo commitano."
        }
    }
}

if (-not (Test-Path -LiteralPath $BuildFile)) {
    Stop-WithMessage "build-release.bat ni najden: $BuildFile"
}

Write-Host ''
Write-Host ("GitHub CLI: " + $GhExe) -ForegroundColor DarkGray

if (-not (Test-NativeSuccess -File $GhExe -Arguments @('auth', 'status'))) {
    Stop-WithMessage 'GitHub prijava ni veljavna. Zazeni: gh auth login'
}

if (-not (Test-NativeSuccess -File 'git' -Arguments @('rev-parse', '--is-inside-work-tree'))) {
    Stop-WithMessage 'Ta mapa ni Git repozitorij.'
}

$CurrentBranch = (
    Get-NativeLines `
        -File 'git' `
        -Arguments @('branch', '--show-current') `
        -FailureMessage 'Aktivne Git veje ni bilo mogoce prebrati.' |
    Select-Object -First 1
)

if ($CurrentBranch -ne $Branch) {
    Stop-WithMessage "Aktivna veja je '$CurrentBranch'. Pricakovana veja je '$Branch'."
}

$OriginUrl = (
    Get-NativeLines `
        -File 'git' `
        -Arguments @('remote', 'get-url', 'origin') `
        -FailureMessage 'Git remote origin ni bil najden.' |
    Select-Object -First 1
)

if ($OriginUrl -notmatch 'ragnarokdrakkar-rgb[/:]GYM(?:\.git)?$') {
    Stop-WithMessage "Napačen Git remote origin: $OriginUrl"
}

Write-Host ''
Write-Host '=== VAREN BUILD + IZRECEN STAGING + PUSH + RELEASE ===' -ForegroundColor Cyan
Write-Host "Repozitorij: $Repository"
Write-Host "Veja: $Branch"

$InitialFiles = Get-ChangedFiles
$InitialUntrackedFiles = Get-UntrackedFiles
$InitialUnsafeFiles = Get-UnsafeFiles `
    -Files $InitialFiles `
    -UntrackedFiles $InitialUntrackedFiles

if ($InitialUnsafeFiles.Count -gt 0) {
    Show-FileList `
        -Title 'BLOKIRANE ALI SUMNJIVE datoteke:' `
        -Files $InitialUnsafeFiles `
        -UntrackedFiles $InitialUntrackedFiles

    Stop-WithMessage 'Odstrani ali premakni blokirane datoteke. Release se ni zagnal.'
}

Show-FileList `
    -Title 'Trenutne lokalne spremembe:' `
    -Files $InitialFiles `
    -UntrackedFiles $InitialUntrackedFiles

if ($InitialFiles.Count -gt 0) {
    Write-Host ''
    $ContinueWithChanges = Read-Host 'Nadaljujem z buildom teh sprememb? (D/N)'

    if ($ContinueWithChanges -notmatch '^(d|da|y|yes)$') {
        Stop-WithMessage 'Postopek je bil preklican. Nobena sprememba ni bila commitana.'
    }
}

Write-Host ''
Write-Host 'Osvezujem vejo main ...' -ForegroundColor Cyan

Invoke-Native `
    -File 'git' `
    -Arguments @('pull', '--ff-only', 'origin', $Branch) `
    -FailureMessage 'Git pull ni uspel. Preveri lokalne spremembe ali oddaljeno vejo.'

Write-Host ''
Write-Host 'Zaganjam release build ...' -ForegroundColor Cyan
Write-Host 'Vnesi novo verzijo, na primer 1.0.17.'
Write-Host ''

$BuildStarted = Get-Date

$PreviousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

& $BuildFile
$BuildExitCode = $LASTEXITCODE

$ErrorActionPreference = $PreviousPreference

if ($BuildExitCode -ne 0) {
    Stop-WithMessage "Build ni uspel. Exit code: $BuildExitCode"
}

if (-not (Test-Path -LiteralPath $ReleaseDirectory)) {
    Stop-WithMessage "Release mapa ni bila ustvarjena: $ReleaseDirectory"
}

$Apk = Get-ChildItem -LiteralPath $ReleaseDirectory -File -Filter 'Workout-Tracker-v*.apk' |
    Where-Object { $_.LastWriteTime -ge $BuildStarted.AddSeconds(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $Apk) {
    $Apk = Get-ChildItem -LiteralPath $ReleaseDirectory -File -Filter 'Workout-Tracker-v*.apk' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if (-not $Apk) {
    Stop-WithMessage 'Po buildu ni bil najden Workout-Tracker APK.'
}

$VersionMatch = [regex]::Match(
    $Apk.Name,
    '^Workout-Tracker-v(\d+\.\d+\.\d+)\.apk$',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

if (-not $VersionMatch.Success) {
    Stop-WithMessage "Iz imena APK ni mogoce prebrati verzije: $($Apk.Name)"
}

$Version = $VersionMatch.Groups[1].Value
$Tag = 'v' + $Version
$ShaFile = Join-Path $ReleaseDirectory ("Workout-Tracker-v{0}-SHA256.txt" -f $Version)

if (-not (Test-Path -LiteralPath $ShaFile)) {
    Stop-WithMessage "SHA256 datoteka ni najdena: $ShaFile"
}

if (Test-ReleaseExists -Tag $Tag) {
    Stop-WithMessage "GitHub Release $Tag ze obstaja. Uporabi visjo verzijo."
}

Write-Host ''
Write-Host "Zaznana verzija: $Version" -ForegroundColor Green
Write-Host "APK: $($Apk.FullName)"
Write-Host "SHA: $ShaFile"

$FinalFiles = Get-ChangedFiles
$FinalUntrackedFiles = Get-UntrackedFiles
$FinalUnsafeFiles = Get-UnsafeFiles `
    -Files $FinalFiles `
    -UntrackedFiles $FinalUntrackedFiles

if ($FinalUnsafeFiles.Count -gt 0) {
    Show-FileList `
        -Title 'BLOKIRANE ALI SUMNJIVE datoteke:' `
        -Files $FinalUnsafeFiles `
        -UntrackedFiles $FinalUntrackedFiles

    Stop-WithMessage 'Commit je blokiran. Nobena datoteka ni bila staged.'
}

Show-FileList `
    -Title 'KONCNI seznam datotek za release commit:' `
    -Files $FinalFiles `
    -UntrackedFiles $FinalUntrackedFiles

if ($FinalFiles.Count -eq 0) {
    Stop-WithMessage 'Po buildu ni Git sprememb za commit.'
}

Confirm-UntrackedFiles -UntrackedFiles $FinalUntrackedFiles

Write-Host ''
Write-Host 'Ponastavljam staging in dodajam samo potrjene datoteke ...' -ForegroundColor Cyan

Reset-Staging

foreach ($File in $FinalFiles) {
    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $StageErrorFile = [System.IO.Path]::GetTempFileName()

    try {
        & git add -A -- $File 2> $StageErrorFile
        $StageExitCode = $LASTEXITCODE

        if ($StageExitCode -ne 0) {
            $StageError = @(
                Get-Content -LiteralPath $StageErrorFile -ErrorAction SilentlyContinue
            )

            Reset-Staging

            if ($StageError.Count -gt 0) {
                Write-Host ''
                $StageError | ForEach-Object {
                    Write-Host $_ -ForegroundColor DarkYellow
                }
            }

            Stop-WithMessage "Datoteke ni bilo mogoce dodati v staging: $File Exit code: $StageExitCode"
        }
    }
    finally {
        $ErrorActionPreference = $PreviousPreference

        if (Test-Path -LiteralPath $StageErrorFile) {
            Remove-Item -LiteralPath $StageErrorFile -Force -ErrorAction SilentlyContinue
        }
    }
}

$StagedFiles = Get-StagedFiles
$StageDifference = @(
    Compare-Object `
        -ReferenceObject @($FinalFiles) `
        -DifferenceObject @($StagedFiles)
)

if ($StageDifference.Count -gt 0) {
    Reset-Staging

    Write-Host ''
    Write-Host 'Razlika med potrjenimi in staged datotekami:' -ForegroundColor Red
    $StageDifference | ForEach-Object {
        Write-Host ("$($_.SideIndicator) $($_.InputObject)")
    }

    Stop-WithMessage 'Staging se ne ujema s potrjenim seznamom. Nic ni bilo commitano.'
}

Write-Host ''
Write-Host 'STAGED DATOTEKE:' -ForegroundColor Yellow
$StagedFiles | ForEach-Object { Write-Host $_ }

Write-Host ''
Write-Host 'Za objavo vpisi TOCNO besedo: OBJAVI' -ForegroundColor Cyan
$PublishConfirm = Read-Host "Objavim $Tag"

if ($PublishConfirm -cne 'OBJAVI') {
    Reset-Staging
    Stop-WithMessage 'Objava je bila preklicana. Build je ostal v release mapi.'
}

$ChangeNote = Read-Host 'Kaj je novega? (Enter za splosni opis)'

if ([string]::IsNullOrWhiteSpace($ChangeNote)) {
    $ChangeNote = 'Stabilna Android posodobitev aplikacije Workout Tracker.'
}

Invoke-Native `
    -File 'git' `
    -Arguments @('commit', '-m', "Release $Tag") `
    -FailureMessage 'Git commit ni uspel.'

Invoke-Native `
    -File 'git' `
    -Arguments @('push', 'origin', $Branch) `
    -FailureMessage 'Git push ni uspel. Release ni bil ustvarjen.'

$NotesFile = Join-Path $ReleaseDirectory ("release-notes-v{0}.md" -f $Version)

$Notes = @"
## Workout Tracker v$Version

$ChangeNote

### Namestitev
- Prenesi ``Workout-Tracker-v$Version.apk``.
- Odpri APK in izberi **Posodobi**.
- Aplikacije pred posodobitvijo ne odstrani, da lokalni podatki ostanejo.

### Datoteke
- podpisan Android APK
- SHA-256 kontrolna vsota
"@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($NotesFile, $Notes, $Utf8NoBom)

Write-Host ''
Write-Host "Objavljam $Tag ..." -ForegroundColor Cyan

Invoke-Native `
    -File $GhExe `
    -Arguments @(
        'release',
        'create',
        $Tag,
        $Apk.FullName,
        $ShaFile,
        '--repo',
        $Repository,
        '--target',
        $Branch,
        '--title',
        "Workout Tracker $Tag",
        '--notes-file',
        $NotesFile,
        '--latest'
    ) `
    -FailureMessage 'GitHub Release ni bil uspesno objavljen.'

$StableDirectory = Join-Path $ProjectRoot ("STABLE\{0}" -f $Version)
New-Item -ItemType Directory -Path $StableDirectory -Force | Out-Null

$BackupFiles = @(
    $Apk.FullName,
    $ShaFile,
    $NotesFile,
    (Join-Path $ProjectRoot 'index.html'),
    (Join-Path $ProjectRoot 'js\core\bootstrap.js'),
    (Join-Path $ProjectRoot 'js\core\state-storage.js'),
    (Join-Path $ProjectRoot 'js\data\exercise-swaps.js'),
    (Join-Path $ProjectRoot 'js\data\programs.js'),
    (Join-Path $ProjectRoot 'js\app.js'),
    (Join-Path $ProjectRoot 'js\workout\engine.js'),
    (Join-Path $ProjectRoot 'js\app-tail.js'),
    (Join-Path $ProjectRoot 'css\app.css'),
    (Join-Path $ProjectRoot 'sw.js'),
    (Join-Path $ProjectRoot 'manifest.json'),
    (Join-Path $ProjectRoot 'package.json'),
    (Join-Path $ProjectRoot 'package-lock.json'),
    (Join-Path $ProjectRoot 'js\app-update.js'),
    (Join-Path $ProjectRoot 'js\rest-native-notifications.js'),
    (Join-Path $ProjectRoot 'js\ui-safe-v1.js'),
    (Join-Path $ProjectRoot 'js\workout\set-log.js'),
    (Join-Path $ProjectRoot 'build-release.bat'),
    (Join-Path $ProjectRoot 'prepare-android.ps1'),
    (Join-Path $ProjectRoot 'update-version.ps1'),
    (Join-Path $ProjectRoot 'publish-release.bat'),
    $MyInvocation.MyCommand.Path,
    (Join-Path $ProjectRoot 'android\app\build.gradle'),
    (Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml')
)

foreach ($File in $BackupFiles) {
    if (Test-Path -LiteralPath $File) {
        Copy-Item -LiteralPath $File -Destination $StableDirectory -Force
    }
}

$ReleaseUrl = "https://github.com/$Repository/releases/tag/$Tag"

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host "USPESNO OBJAVLJENO: $Tag" -ForegroundColor Green
Write-Host "Git veja: origin/$Branch"
Write-Host "Release: $ReleaseUrl"
Write-Host "Backup: $StableDirectory"
Write-Host '========================================' -ForegroundColor Green
