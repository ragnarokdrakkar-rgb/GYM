param(
    [Parameter(Mandatory = $true)]
    [string]$GradleFile,

    [Parameter(Mandatory = $true)]
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$Version = $Version.Trim()

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Neveljavna verzija '$Version'. Uporabi obliko, na primer 1.0.2."
}

if (-not (Test-Path -LiteralPath $GradleFile)) {
    throw "Datoteka ni najdena: $GradleFile"
}

$content = [System.IO.File]::ReadAllText($GradleFile)

$codeMatch = [regex]::Match(
    $content,
    'versionCode\s*(?:=\s*)?(\d+)'
)

if (-not $codeMatch.Success) {
    throw 'versionCode ni najden v build.gradle.'
}

$nameMatch = [regex]::Match(
    $content,
    'versionName\s*(?:=\s*)?"[^"]+"'
)

if (-not $nameMatch.Success) {
    throw 'versionName ni najden v build.gradle.'
}

$currentCode = [int]$codeMatch.Groups[1].Value
$nextCode = $currentCode + 1

$content = [regex]::Replace(
    $content,
    'versionCode\s*(?:=\s*)?\d+',
    "versionCode $nextCode",
    1
)

$content = [regex]::Replace(
    $content,
    'versionName\s*(?:=\s*)?"[^"]+"',
    "versionName `"$Version`"",
    1
)

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $GradleFile,
    $content,
    $utf8WithoutBom
)

Write-Host ""
Write-Host "VersionCode: $currentCode -> $nextCode"
Write-Host "VersionName: $Version"
Write-Host ""