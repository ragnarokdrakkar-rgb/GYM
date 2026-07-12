param(
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

$Repository = 'ragnarokdrakkar-rgb/GYM'
$BuildFile = Join-Path $ProjectRoot 'build-release.bat'
$ReleaseDirectory = Join-Path $ProjectRoot 'release'

function Stop-WithMessage {
    param([string]$Message)

    Write-Host ''
    Write-Host ('NAPAKA: ' + $Message) -ForegroundColor Red
    exit 1
}

try {
    & gh --version | Out-Null
} catch {
    Stop-WithMessage 'GitHub CLI (gh) ni namescen ali ni v PATH.'
}

if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage 'GitHub CLI (gh) ni namescen ali ni v PATH.'
}

Write-Host ''
Write-Host 'Preverjam GitHub prijavo ...' -ForegroundColor Cyan

& cmd.exe /d /c "gh auth status >nul 2>&1"
$AuthExitCode = $LASTEXITCODE

if ($AuthExitCode -ne 0) {
    Stop-WithMessage 'GitHub prijava ni veljavna. Zazeni: gh auth login'
}

$BuildStarted = $null

if (-not $SkipBuild) {
    if (-not (Test-Path -LiteralPath $BuildFile)) {
        Stop-WithMessage "build-release.bat ni najden: $BuildFile"
    }

    Write-Host ''
    Write-Host '=== BUILD + GITHUB RELEASE ===' -ForegroundColor Cyan
    Write-Host 'Build skripta bo zdaj vprasala za novo verzijo.'
    Write-Host ''

    $BuildStarted = Get-Date

    & $BuildFile
    $BuildExitCode = $LASTEXITCODE

    if ($BuildExitCode -ne 0) {
        Stop-WithMessage "Build ni uspel. Exit code: $BuildExitCode"
    }
} else {
    Write-Host ''
    Write-Host '=== OBJAVA OBSTOJECEGA BUILDA ===' -ForegroundColor Cyan
    Write-Host 'Build je preskocen. Uporabljen bo najnovejsi APK iz release mape.'
}

if (-not (Test-Path -LiteralPath $ReleaseDirectory)) {
    Stop-WithMessage "Release mapa ni bila najdena: $ReleaseDirectory"
}

$Apk = $null

if ($BuildStarted) {
    $Apk = Get-ChildItem -LiteralPath $ReleaseDirectory -File -Filter 'Workout-Tracker-v*.apk' |
        Where-Object { $_.LastWriteTime -ge $BuildStarted.AddSeconds(-5) } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if (-not $Apk) {
    $Apk = Get-ChildItem -LiteralPath $ReleaseDirectory -File -Filter 'Workout-Tracker-v*.apk' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if (-not $Apk) {
    Stop-WithMessage 'V release mapi ni bil najden Workout-Tracker APK.'
}

$Match = [regex]::Match(
    $Apk.Name,
    '^Workout-Tracker-v(\d+\.\d+\.\d+)\.apk$',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

if (-not $Match.Success) {
    Stop-WithMessage "Iz imena APK ni mogoce prebrati verzije: $($Apk.Name)"
}

$Version = $Match.Groups[1].Value
$Tag = 'v' + $Version
$ShaFile = Join-Path $ReleaseDirectory ("Workout-Tracker-v{0}-SHA256.txt" -f $Version)

if (-not (Test-Path -LiteralPath $ShaFile)) {
    Stop-WithMessage "SHA256 datoteka ni najdena: $ShaFile"
}

Write-Host ''
Write-Host ("Zaznana verzija: {0}" -f $Version) -ForegroundColor Green
Write-Host ("APK: {0}" -f $Apk.FullName)
Write-Host ("SHA: {0}" -f $ShaFile)

# Pri neobstojecem releasu gh vrne exit code 1 in tekst "release not found".
# Preverjanje izvedemo skozi cmd.exe, da PowerShell tega ne spremeni v terminating error.
$CheckCommand = 'gh release view "{0}" --repo "{1}" >nul 2>&1' -f $Tag, $Repository
& cmd.exe /d /c $CheckCommand
$ReleaseViewExitCode = $LASTEXITCODE

if ($ReleaseViewExitCode -eq 0) {
    Stop-WithMessage "GitHub Release $Tag ze obstaja. Uporabi visjo verzijo."
}

$Confirm = Read-Host "Objavim $Tag kot najnovejsi GitHub Release? (D/N)"

if ($Confirm -notmatch '^(d|da|y|yes)$') {
    Stop-WithMessage 'Objava je bila preklicana. APK je ostal v release mapi.'
}

$ChangeNote = Read-Host 'Kaj je novega? (Enter za splosni opis)'

if ([string]::IsNullOrWhiteSpace($ChangeNote)) {
    $ChangeNote = 'Stabilna Android posodobitev aplikacije Workout Tracker.'
}

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

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

& gh release create $Tag `
    $Apk.FullName `
    $ShaFile `
    --repo $Repository `
    --target main `
    --title "Workout Tracker $Tag" `
    --notes-file $NotesFile `
    --latest

$CreateExitCode = $LASTEXITCODE
$ErrorActionPreference = $PreviousErrorActionPreference

if ($CreateExitCode -ne 0) {
    Stop-WithMessage "GitHub Release ni bil uspesno objavljen. Exit code: $CreateExitCode"
}

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
    $MyInvocation.MyCommand.Path,
    (Join-Path $ProjectRoot 'publish-release.bat')
)

foreach ($File in $BackupFiles) {
    if (Test-Path -LiteralPath $File) {
        Copy-Item -LiteralPath $File -Destination $StableDirectory -Force
    }
}

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$ReleaseUrl = & gh release view $Tag --repo $Repository --json url --jq '.url'
$ViewCreatedExitCode = $LASTEXITCODE
$ErrorActionPreference = $PreviousErrorActionPreference

if ($ViewCreatedExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($ReleaseUrl)) {
    $ReleaseUrl = "https://github.com/$Repository/releases/tag/$Tag"
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host "USPESNO OBJAVLJENO: $Tag" -ForegroundColor Green
Write-Host "Release: $ReleaseUrl"
Write-Host "Backup: $StableDirectory"
Write-Host '========================================' -ForegroundColor Green