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

function Invoke-Cmd {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    & cmd.exe /d /c $Command
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    if ($ExitCode -ne 0) {
        Stop-WithMessage "$FailureMessage Exit code: $ExitCode"
    }
}

function Test-ReleaseExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Tag
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    & $script:GhExe release view $Tag --repo $Repository *> $null
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    return ($ExitCode -eq 0)
}

function Get-GitLines {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    $Output = @(& cmd.exe /d /c $Command)
    $ExitCode = $LASTEXITCODE

    $ErrorActionPreference = $PreviousPreference

    if ($ExitCode -ne 0) {
        Stop-WithMessage "Git ukaz ni uspel: $Command"
    }

    return @(
        $Output |
        ForEach-Object { [string]$_ } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

if (-not (Test-Path -LiteralPath $BuildFile)) {
    Stop-WithMessage "build-release.bat ni najden: $BuildFile"
}

Write-Host ''
Write-Host ("GitHub CLI: " + $GhExe) -ForegroundColor DarkGray

$PreviousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

& $GhExe auth status *> $null
$AuthExitCode = $LASTEXITCODE

$ErrorActionPreference = $PreviousPreference

if ($AuthExitCode -ne 0) {
    Stop-WithMessage 'GitHub prijava ni veljavna. Zazeni: gh auth login'
}

Invoke-Cmd `
    -Command 'git rev-parse --is-inside-work-tree >nul 2>&1' `
    -FailureMessage 'Ta mapa ni Git repozitorij.'

$CurrentBranchLines = Get-GitLines -Command 'git branch --show-current'
$CurrentBranch = $CurrentBranchLines | Select-Object -First 1

if ($CurrentBranch -ne $Branch) {
    Stop-WithMessage "Aktivna veja je '$CurrentBranch'. Pricakovana veja je '$Branch'."
}

Write-Host ''
Write-Host '=== VAREN BUILD + COMMIT + PUSH + RELEASE ===' -ForegroundColor Cyan
Write-Host "Repozitorij: $Repository"
Write-Host "Veja: $Branch"

$InitialChanges = Get-GitLines -Command 'git status --short'

if ($InitialChanges.Count -gt 0) {
    Write-Host ''
    Write-Host 'Trenutne lokalne spremembe:' -ForegroundColor Yellow
    $InitialChanges | ForEach-Object { Write-Host $_ }

    $ContinueWithChanges = Read-Host 'Vkljucim te spremembe v novo izdajo? (D/N)'

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
Write-Host 'Vnesi novo verzijo, na primer 1.0.12.'
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

Write-Host ''
Write-Host 'Pripravljam Git spremembe ...' -ForegroundColor Cyan

Invoke-Native `
    -File 'git' `
    -Arguments @('add', '-A') `
    -FailureMessage 'git add ni uspel.'

$StagedFiles = Get-GitLines -Command 'git diff --cached --name-only'

$ForbiddenPatterns = @(
    '(^|/)node_modules/',
    '(^|/)www/',
    '(^|/)release/',
    '(^|/)STABLE/',
    '(^|/)\.idea/',
    '(^|/)local\.properties$',
    '(^|/)keystore\.properties$',
    '\.jks$',
    '\.keystore$',
    '\.bak$'
)

$ForbiddenFiles = @()

foreach ($File in $StagedFiles) {
    foreach ($Pattern in $ForbiddenPatterns) {
        if ($File -match $Pattern) {
            $ForbiddenFiles += $File
            break
        }
    }
}

if ($ForbiddenFiles.Count -gt 0) {
    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & git reset
    $ErrorActionPreference = $PreviousPreference

    Write-Host ''
    Write-Host 'Prepovedane datoteke:' -ForegroundColor Red
    $ForbiddenFiles | Sort-Object -Unique | ForEach-Object { Write-Host $_ }

    Stop-WithMessage 'Commit je bil blokiran. Datoteke so bile odstranjene iz staginga.'
}

Write-Host ''
Write-Host 'Datoteke za commit:' -ForegroundColor Yellow

if ($StagedFiles.Count -eq 0) {
    Write-Host '(ni sprememb za commit)'
} else {
    $StagedFiles | ForEach-Object { Write-Host $_ }
}

$PublishConfirm = Read-Host "Commitam, potisnem in objavim $Tag? (D/N)"

if ($PublishConfirm -notmatch '^(d|da|y|yes)$') {
    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & git reset
    $ErrorActionPreference = $PreviousPreference

    Stop-WithMessage 'Objava je bila preklicana. Build je ostal v release mapi.'
}

$ChangeNote = Read-Host 'Kaj je novega? (Enter za splosni opis)'

if ([string]::IsNullOrWhiteSpace($ChangeNote)) {
    $ChangeNote = 'Stabilna Android posodobitev aplikacije Workout Tracker.'
}

if ($StagedFiles.Count -gt 0) {
    Invoke-Native `
        -File 'git' `
        -Arguments @('commit', '-m', "Release $Tag") `
        -FailureMessage 'Git commit ni uspel.'
} else {
    Write-Host ''
    Write-Host 'Ni novih Git sprememb. Commit je preskocen.' -ForegroundColor Yellow
}

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
    (Join-Path $ProjectRoot 'js\app-update.js'),
    (Join-Path $ProjectRoot 'build-release.bat'),
    (Join-Path $ProjectRoot 'prepare-android.ps1'),
    (Join-Path $ProjectRoot 'update-version.ps1'),
    (Join-Path $ProjectRoot 'publish-release.bat'),
    $MyInvocation.MyCommand.Path
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
