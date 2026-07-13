param(
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot
$OutputFile = Join-Path $ProjectRoot 'js\app.js'

$SourceFiles = @(
    (Join-Path $ProjectRoot 'src\app\ui-shell.js'),
    (Join-Path $ProjectRoot 'src\app\workout-model.js'),
    (Join-Path $ProjectRoot 'src\app\profile-strength.js'),
    (Join-Path $ProjectRoot 'src\app\main.js')
)

foreach ($SourceFile in $SourceFiles) {
    if (-not (Test-Path -LiteralPath $SourceFile)) {
        throw "APP BUNDLE: manjka source datoteka: $SourceFile"
    }
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw 'APP BUNDLE: node.exe ni bil najden.'
}

$Combined = ''

foreach ($SourceFile in $SourceFiles) {
    $Combined += [System.IO.File]::ReadAllText($SourceFile)
}

if ([string]::IsNullOrWhiteSpace($Combined)) {
    throw 'APP BUNDLE: sestavljena koda je prazna.'
}

foreach ($RequiredToken in @(
    'function toggleTheme(){',
    'function showPage(p){',
    'function getExtraSets(',
    '// ============== PROFIL SISTEM ==============',
    'const EX_MAP ='
)) {
    if (-not $Combined.Contains($RequiredToken)) {
        throw "APP BUNDLE: manjka obvezni token: $RequiredToken"
    }
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$TempFile = Join-Path (
    [System.IO.Path]::GetTempPath()
) (
    'workout-app-bundle-' +
    [guid]::NewGuid().ToString('N') +
    '.js'
)

try {
    [System.IO.File]::WriteAllText(
        $TempFile,
        $Combined,
        $Utf8NoBom
    )

    & node.exe --check $TempFile

    if ($LASTEXITCODE -ne 0) {
        throw 'APP BUNDLE: JavaScript sintaksa ni veljavna.'
    }

    [System.IO.File]::WriteAllText(
        $OutputFile,
        $Combined,
        $Utf8NoBom
    )

    & node.exe --check $OutputFile

    if ($LASTEXITCODE -ne 0) {
        throw 'APP BUNDLE: koncni js/app.js ni veljaven.'
    }
}
finally {
    if (Test-Path -LiteralPath $TempFile) {
        Remove-Item -LiteralPath $TempFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not $Quiet) {
    Write-Host ''
    Write-Host 'APP BUNDLE: OK' -ForegroundColor Green
    Write-Host 'Source vrstni red: ui-shell.js -> workout-model.js -> profile-strength.js -> main.js'
    Write-Host 'Runtime datoteka: js/app.js'
    Write-Host ''
}