[CmdletBinding()]
param(
    [string]$Server = "161.104.54.173",
    [string]$DeployUser = "deploy",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\voople_selectel"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$examplePath = Join-Path $repoRoot ".env.example"
$localEnvPath = Join-Path $repoRoot ".env.local"

if (-not (Test-Path -LiteralPath $localEnvPath -PathType Leaf)) {
    throw "Missing $localEnvPath"
}

if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
    throw "Missing SSH key $KeyPath"
}

$allowed = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

foreach ($line in Get-Content -LiteralPath $examplePath) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=') {
        [void]$allowed.Add($Matches[1])
    }
}

foreach ($key in @(
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "S3_FORCE_PATH_STYLE",
    "VOOPLE_ADMIN_USER_IDS"
)) {
    [void]$allowed.Add($key)
}

$values = [ordered]@{}
foreach ($line in Get-Content -LiteralPath $localEnvPath) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $key = $Matches[1]
        if ($allowed.Contains($key)) {
            $values[$key] = $Matches[2]
        }
    }
}

$overrides = [ordered]@{
    NEXT_PUBLIC_APP_URL        = "https://voople.app"
    NEXT_PUBLIC_ASSETS_CDN_URL = "https://cdn.voople.app"
    NEXT_PUBLIC_LIVEKIT_URL    = "wss://rtc.voople.app"
    LIVEKIT_URL                = "wss://rtc.voople.app"
    LIVEKIT_FALLBACK_URLS      = "wss://rtc-ru.voople.ru"
}

foreach ($entry in $overrides.GetEnumerator()) {
    $values[$entry.Key] = $entry.Value
}

$required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET"
)

$missing = @($required | Where-Object {
    -not $values.Contains($_) -or [string]::IsNullOrWhiteSpace($values[$_])
})
if ($missing.Count -gt 0) {
    throw "Required production variables are missing: $($missing -join ', ')"
}

$payload = @($values.GetEnumerator() | ForEach-Object {
    "{0}={1}" -f $_.Key, $_.Value
})

$remote = "$DeployUser@$Server"
$remoteCommand = "set -eu; umask 077; cat > /opt/voople/app.env.next; test -s /opt/voople/app.env.next; chmod 600 /opt/voople/app.env.next; mv /opt/voople/app.env.next /opt/voople/app.env"

$sshArguments = @(
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=20",
    "-i", $KeyPath,
    $remote,
    $remoteCommand
)

$payload | & ssh.exe @sshArguments

if ($LASTEXITCODE -ne 0) {
    throw "SSH upload failed with exit code $LASTEXITCODE"
}

Write-Host "Uploaded $($payload.Count) allowlisted production variables to $remote."
