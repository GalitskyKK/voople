[CmdletBinding()]
param(
    [string]$Server = "161.104.58.17",
    [string]$DeployUser = "root",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\voople_selectel"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$caddyConfig = Join-Path $repoRoot "deploy\livekit\caddy.yaml"

if (-not (Test-Path -LiteralPath $caddyConfig -PathType Leaf)) {
    throw "Missing $caddyConfig"
}

if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
    throw "Missing SSH key $KeyPath"
}

$remote = "$DeployUser@$Server"
$commonArguments = @(
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=20",
    "-i", $KeyPath
)

& scp.exe @commonArguments $caddyConfig "${remote}:/opt/livekit/caddy.yaml.next"
if ($LASTEXITCODE -ne 0) {
    throw "Caddy config upload failed with exit code $LASTEXITCODE"
}

$remoteCommand = @'
set -eu
cd /opt/livekit

docker run --rm \
  -v /opt/livekit/caddy.yaml.next:/etc/caddy.yaml:ro \
  livekit/caddyl4 \
  validate --config /etc/caddy.yaml --adapter yaml

stamp=$(date -u +%Y%m%dT%H%M%SZ)
caddy_backup="caddy.yaml.backup.${stamp}"
cp -a caddy.yaml "$caddy_backup"
mv caddy.yaml.next caddy.yaml

if ! docker compose restart caddy; then
  cp -a "$caddy_backup" caddy.yaml
  docker compose restart caddy
  exit 1
fi

for domain in rtc.voople.app turn.voople.app; do
  ready=0
  attempt=1
  while [ "$attempt" -le 12 ]; do
    if timeout 8 openssl s_client \
      -connect 127.0.0.1:443 \
      -servername "$domain" \
      </dev/null 2>/dev/null \
      | openssl x509 -noout -ext subjectAltName 2>/dev/null \
      | grep -q "$domain"; then
      ready=1
      break
    fi
    sleep 5
    attempt=$((attempt + 1))
  done
  if [ "$ready" -ne 1 ]; then
    echo "Certificate was not issued for $domain" >&2
    exit 1
  fi
done

livekit_backup="livekit.yaml.backup.${stamp}"
cp -a livekit.yaml "$livekit_backup"
sed -i 's/domain: turn-ru\.voople\.ru/domain: turn.voople.app/' livekit.yaml
grep -q 'domain: turn.voople.app' livekit.yaml

if ! docker compose up -d livekit; then
  cp -a "$livekit_backup" livekit.yaml
  docker compose up -d livekit
  exit 1
fi

docker compose ps
'@

& ssh.exe @commonArguments $remote $remoteCommand
if ($LASTEXITCODE -ne 0) {
    throw "LiveKit domain migration failed with exit code $LASTEXITCODE"
}

Write-Host "LiveKit now serves rtc.voople.app and advertises turn.voople.app."
