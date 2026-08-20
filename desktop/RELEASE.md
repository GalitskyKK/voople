# Voople Desktop release

The Windows release pipeline lives in `.github/workflows/desktop-release.yml`.
It produces one signed RC artifact, rehearses compatible migrations on staging,
runs web, desktop, browser and native-audio gates, and retains that artifact in
the internal Actions channel. The protected `desktop-stable` environment then
promotes the exact same SHA/checksum/signature after approval: production
migrations and the emoji backfill run first, followed by the private GitHub
Release and stable CDN publication. No second installer is built during
promotion and users see only the resulting stable release.

A `desktop-vX.Y.Z` tag requests promotion automatically; a manual run promotes
only when `publish` is enabled. Publishing an unsigned test build additionally
requires `allow_unsigned`. Tagged releases require Authenticode when
`DESKTOP_REQUIRE_WINDOWS_SIGNING=true`; Tauri updater signatures are mandatory
for every RC and stable release.

The tag must match the version in `desktop/package.json` and
`desktop/src-tauri/tauri.conf.json`.

## GitHub configuration

Configure these repository secrets:

- `DESKTOP_SUPABASE_URL`
- `DESKTOP_SUPABASE_ANON_KEY`
- `DESKTOP_RELEASE_S3_ENDPOINT`
- `DESKTOP_RELEASE_S3_REGION`
- `DESKTOP_RELEASE_S3_BUCKET`
- `DESKTOP_RELEASE_S3_ACCESS_KEY_ID`
- `DESKTOP_RELEASE_S3_SECRET_ACCESS_KEY`
- `DESKTOP_UPDATER_PRIVATE_KEY`
- `DESKTOP_UPDATER_PRIVATE_KEY_PASSWORD`
- `DESKTOP_STAGING_DATABASE_URL`
- `DESKTOP_PRODUCTION_DATABASE_URL` (store this in the protected
  `desktop-stable` environment)
- `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`,
  `E2E_SUPABASE_SERVICE_ROLE_KEY` and `E2E_USER_EMAIL`

Configure these repository variables:

- `DESKTOP_API_URL`, for example `https://voople.ru`
- `DESKTOP_ASSETS_CDN_URL`, for example `https://cdn.voople.ru`
- `DESKTOP_RELEASE_PUBLIC_BASE_URL`, the public bucket or CDN origin
- `DESKTOP_TURNSTILE_SITE_KEY`, when Turnstile is enabled
- `DESKTOP_RELEASE_S3_FORCE_PATH_STYLE`, set to `true` only when the provider
  requires path-style S3 requests
- `DESKTOP_UPDATER_PUBLIC_KEY`, the public half of the Tauri updater key
- `DESKTOP_REQUIRE_WINDOWS_SIGNING`, set to `true` only after Authenticode
  signing is configured; updater signatures remain mandatory either way

Generate the updater key pair once and keep it for the lifetime of the app:

```powershell
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\voople-updater.key"
```

Copy the private key file contents into `DESKTOP_UPDATER_PRIVATE_KEY`, its
password into `DESKTOP_UPDATER_PRIVATE_KEY_PASSWORD`, and the generated public
key contents into the `DESKTOP_UPDATER_PUBLIC_KEY` repository variable. This is
independent from optional Windows Authenticode/PFX signing; Tauri updater
signatures are mandatory and work without a company certificate.

For signed Windows builds, also configure:

- `WINDOWS_CERTIFICATE_BASE64`, the base64-encoded PFX
- `WINDOWS_CERTIFICATE_PASSWORD`

Without those two Windows signing secrets releases remain installable but may
show a SmartScreen warning. Once `DESKTOP_REQUIRE_WINDOWS_SIGNING=true`, tagged
releases and normal public publishing runs fail when Authenticode signing is
unavailable or invalid. This does not weaken updater verification, which always
uses the separate mandatory Tauri updater key.

The storage policy must allow anonymous reads for `desktop/*`, while write
credentials remain private. The pipeline publishes:

- `desktop/Voople-Setup-x64.exe`
- `desktop/Voople-Setup-x64.exe.sha256`
- `desktop/releases/X.Y.Z/Voople-Setup-x64.exe.sig`
- `desktop/latest.json`
- `desktop/release-catalog.json`
- `desktop/releases/X.Y.Z/release.json`
- immutable copies under `desktop/releases/X.Y.Z/`

Configure the GitHub environment `desktop-stable` with required reviewers. Its
approval is the stable promotion boundary and must not be bypassed by a tag.

## Native audio toolchain

The Windows job first tries to build `process-audio-publisher`. LiveKit 0.8.1
expects a current Visual Studio 2022 Windows runner and Windows SDK containing
the `NTDDI_WIN11_GE` definitions (SDK 10.0.26100 or newer). If the runner cannot
compile the generated CXX bridge, the workflow records that capability in the
artifact provenance and rebuilds the same release without the feature. Screen
video remains available, while isolated process audio is reported as
unsupported for that build.
Set the web service's server-only `DESKTOP_NATIVE_PROCESS_AUDIO_ENABLED=false`
to refuse new publisher leases without stopping screen video. Removing the
server-only `GOOGLE_WEB_RISK_API_KEY` similarly fails link checks closed as
`unknown` instead of treating them as safe.

Set the web deployment's server-only `DESKTOP_INSTALLER_URL` to the public URL
of `desktop/Voople-Setup-x64.exe`. The landing page links to the same-origin
`/download/desktop` route, so the public storage origin can change without a
frontend code change.

## Release

1. Run `npm run release` on a clean, synchronized `master`. It updates all
   versions and `CHANGELOG.md`, verifies the migration ledger and the portable
   local gates, then atomically pushes the commit and tag after confirmation.
   Native installer and process-audio checks run on GitHub; set
   `VERIFY_NATIVE_AUDIO=1` only when intentionally checking the local Windows
   toolchain.
2. Verify the internal RC artifact and staging migration rehearsal.
3. Approve `desktop-stable` only after the staging and installer smoke results
   are accepted.
4. Verify production migration readiness, signature, checksum,
   install/uninstall, updater, release catalog and `/download/desktop` before
   announcing the release.
