# Verifies a release APK before it may be published as an update.
# Checks: apksigner verification (v2/v3), exactly one signer whose certificate
# SHA-256 matches the existing release key, applicationId, and versionCode
# higher than the last published release. Prints only public certificate
# digests, never keystore paths, aliases or passwords.
param(
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [string]$ExpectedCertSha256 = 'b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086',
    [string]$ExpectedPackage = 'com.kemal.workouttracker',
    [int]$MinVersionCodeExclusive = 0,
    [int]$ExpectedVersionCode = 0
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
    Write-Host ''
    Write-Host ('PODPIS NI VELJAVEN: ' + $Message) -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $ApkPath)) { Fail "APK ne obstaja: $ApkPath" }

# Find the newest Android SDK build-tools directory with apksigner and aapt2.
$SdkRoots = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) |
    Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'build-tools')) }
if (-not $SdkRoots) { Fail 'Android SDK build-tools ni najden (ANDROID_HOME / ANDROID_SDK_ROOT / %LOCALAPPDATA%\Android\Sdk).' }

$BuildTools = $null
foreach ($Root in $SdkRoots) {
    $Candidate = Get-ChildItem -LiteralPath (Join-Path $Root 'build-tools') -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'apksigner.bat') } |
        Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending |
        Select-Object -First 1
    if ($Candidate) { $BuildTools = $Candidate.FullName; break }
}
if (-not $BuildTools) { Fail 'apksigner.bat ni najden v Android SDK build-tools.' }

$Apksigner = Join-Path $BuildTools 'apksigner.bat'
$Aapt2 = Join-Path $BuildTools 'aapt2.exe'

$SignerOutput = @(& $Apksigner verify --verbose --print-certs $ApkPath 2>&1 | ForEach-Object { "$_" })
if ($LASTEXITCODE -ne 0) { Fail ('apksigner verify ni uspel: ' + ($SignerOutput -join ' ')) }

$Joined = $SignerOutput -join "`n"
if ($Joined -notmatch 'Verified using v2 scheme \(APK Signature Scheme v2\): true' -and
    $Joined -notmatch 'Verified using v3 scheme \(APK Signature Scheme v3\): true') {
    Fail 'APK ni podpisan s shemo v2 ali v3.'
}
if ($Joined -match 'CN=Android Debug') { Fail 'APK je podpisan z debug kljucem.' }

$Digests = @($SignerOutput | ForEach-Object {
    $Match = [regex]::Match($_, '^Signer #(\d+) certificate SHA-256 digest:\s*([0-9a-fA-F:]+)\s*$')
    if ($Match.Success) { $Match.Groups[2].Value.Replace(':', '').ToLowerInvariant() }
})
if ($Digests.Count -ne 1) { Fail "Pricakovan je natanko en podpisnik, najdenih: $($Digests.Count)." }

$Expected = $ExpectedCertSha256.Replace(':', '').ToLowerInvariant()
if ($Digests[0] -ne $Expected) {
    Fail "Certifikat se ne ujema z obstojecim release kljucem.`n  pricakovan: $Expected`n  najden:     $($Digests[0])"
}

if (-not (Test-Path -LiteralPath $Aapt2)) { Fail "aapt2.exe ni najden v $BuildTools." }
$Badging = @(& $Aapt2 dump badging $ApkPath 2>&1 | ForEach-Object { "$_" })
if ($LASTEXITCODE -ne 0) { Fail 'aapt2 dump badging ni uspel.' }
$PackageLine = $Badging | Where-Object { $_ -like 'package:*' } | Select-Object -First 1
$Package = [regex]::Match($PackageLine, "name='([^']+)'").Groups[1].Value
$VersionCodeText = [regex]::Match($PackageLine, "versionCode='(\d+)'").Groups[1].Value
$VersionName = [regex]::Match($PackageLine, "versionName='([^']+)'").Groups[1].Value
if (-not $VersionCodeText) { Fail 'versionCode ni bil prebran iz APK.' }
$VersionCode = [int]$VersionCodeText

if ($Package -ne $ExpectedPackage) { Fail "applicationId je '$Package', pricakovan '$ExpectedPackage'." }
if ($ExpectedVersionCode -gt 0 -and $VersionCode -ne $ExpectedVersionCode) {
    Fail "versionCode v APK je $VersionCode, pricakovan $ExpectedVersionCode."
}
if ($VersionCode -le $MinVersionCodeExclusive) {
    Fail "versionCode $VersionCode ni visji od objavljenega $MinVersionCodeExclusive."
}

$ApkHash = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256).Hash.ToLowerInvariant()

Write-Host ''
Write-Host 'PODPIS PREVERJEN' -ForegroundColor Green
Write-Host "  applicationId:   $Package"
Write-Host "  versionName:     $VersionName"
Write-Host "  versionCode:     $VersionCode (objavljen: $MinVersionCodeExclusive)"
Write-Host "  certifikat SHA-256: $($Digests[0])"
Write-Host "  APK SHA-256:     $ApkHash"
exit 0
