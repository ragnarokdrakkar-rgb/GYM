param(
    [Parameter(Mandatory = $true)]
    [string]$IndexFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $IndexFile)) {
    throw "Android index.html ni najden: $IndexFile"
}

$wwwDirectory = Split-Path -Parent $IndexFile
$updateScriptFile = Join-Path $wwwDirectory "js\app-update.js"

if (-not (Test-Path -LiteralPath $updateScriptFile)) {
    throw "Update skripta ni najdena: $updateScriptFile"
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
    $content = $content -replace(
        '<head>',
        "<head>`r`n$androidBootstrap"
    )
}

$oldServiceWorkerCondition = `
    "if('serviceWorker' in navigator){"

$newServiceWorkerCondition = `
    "if('serviceWorker' in navigator && " +
    "!window.__WT_ANDROID_APP__){"

if ($content.Contains($oldServiceWorkerCondition)) {
    $content = $content.Replace(
        $oldServiceWorkerCondition,
        $newServiceWorkerCondition
    )

    Write-Host "Service worker je izklopljen za Android."
}

$content = [regex]::Replace(
    $content,
    '<link\s+rel=["'']manifest["''][^>]*>',
    '',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$updateTag = '<script src="js/app-update.js"></script>'

if ($content -notmatch 'js/app-update\.js') {
    if ($content -notmatch '</body>') {
        throw "Zakljucna oznaka </body> ni najdena."
    }

    $content = $content -replace(
        '</body>',
        "$updateTag`r`n</body>"
    )

    Write-Host "Update checker je dodan v Android index."
}

$utf8WithoutBom =
    New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $IndexFile,
    $content,
    $utf8WithoutBom
)

Write-Host "Android index pripravljen: $IndexFile"