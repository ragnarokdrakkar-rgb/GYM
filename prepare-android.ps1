param(
    [Parameter(Mandatory = $true)]
    [string]$IndexFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $IndexFile)) {
    throw "Android index.html ni najden: $IndexFile"
}

$wwwDirectory = Split-Path -Parent $IndexFile
$updateScriptFile = Join-Path $wwwDirectory 'js\app-update.js'
$restNotificationFile = Join-Path $wwwDirectory 'js\rest-native-notifications.js'
$uiSafeFile = Join-Path $wwwDirectory 'js\ui-safe-v1.js'

if (-not (Test-Path -LiteralPath $updateScriptFile)) {
    throw "Update skripta ni najdena: $updateScriptFile"
}

if (-not (Test-Path -LiteralPath $restNotificationFile)) {
    throw "Native timer skripta ni najdena: $restNotificationFile"
}

if (-not (Test-Path -LiteralPath $uiSafeFile)) {
    throw "Varna UI skripta ni najdena: $uiSafeFile"
}

$content = [System.IO.File]::ReadAllText($IndexFile)

$androidBootstrap = @'
<script>
window.__WT_ANDROID_APP__ = true;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then(function (registrations) {
            registrations.forEach(function (registration) {
                registration.unregister().catch(function () {});
            });
        })
        .catch(function () {});
}
</script>
'@

if ($content -notmatch '__WT_ANDROID_APP__') {
    if (-not $content.Contains('<head>')) {
        throw "Zacetna oznaka <head> ni najdena."
    }

    $content = $content.Replace(
        '<head>',
        "<head>`r`n$androidBootstrap"
    )
}

$oldServiceWorkerCondition = "if('serviceWorker' in navigator){"
$newServiceWorkerCondition = "if('serviceWorker' in navigator && !window.__WT_ANDROID_APP__){"

if ($content.Contains($oldServiceWorkerCondition)) {
    $content = $content.Replace(
        $oldServiceWorkerCondition,
        $newServiceWorkerCondition
    )

    Write-Host 'Service worker je izklopljen za Android.'
}

$content = [regex]::Replace(
    $content,
    '<link\s+rel=["'']manifest["''][^>]*>',
    '',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$scriptTags = @(
    '<script src="js/app-update.js"></script>',
    '<script src="js/rest-native-notifications.js"></script>',
    '<script src="js/ui-safe-v1.js"></script>'
)

foreach ($scriptTag in $scriptTags) {
    $srcMatch = [regex]::Match(
        $scriptTag,
        'src="([^"]+)"'
    )

    $src = $srcMatch.Groups[1].Value
    $escapedSrc = [regex]::Escape($src)

    if ($content -notmatch $escapedSrc) {
        if ($content -notmatch '</body>') {
            throw "Zakljucna oznaka </body> ni najdena."
        }

        $content = [regex]::Replace(
            $content,
            '</body>',
            "$scriptTag`r`n</body>",
            1
        )

        Write-Host "Dodana Android skripta: $src"
    }
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $IndexFile,
    $content,
    $utf8WithoutBom
)

Write-Host "Android index pripravljen: $IndexFile"
