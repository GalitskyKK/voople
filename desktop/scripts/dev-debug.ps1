$ErrorActionPreference = "Stop"
$env:RUST_BACKTRACE = "1"
$env:RUST_LOG = "tauri=info,voople_desktop=debug"

Set-Location (Resolve-Path (Split-Path $PSScriptRoot -Parent))
npm run tauri:dev
