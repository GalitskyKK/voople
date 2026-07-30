# Voople Desktop release

The Windows release pipeline lives in
`.github/workflows/desktop-release.yml`. It always builds and retains a private
workflow artifact. A `desktop-vX.Y.Z` tag also creates a release in the private
GitHub repository and publishes a stable public installer to S3-compatible
storage. A manual run publishes only when the `publish` input is enabled.
Publishing an unsigned test build additionally requires the explicit
`allow_unsigned` input. Tagged releases always require a valid signature.

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

Configure these repository variables:

- `DESKTOP_API_URL`, for example `https://voople.ru`
- `DESKTOP_ASSETS_CDN_URL`, for example `https://cdn.voople.ru`
- `DESKTOP_RELEASE_PUBLIC_BASE_URL`, the public bucket or CDN origin
- `DESKTOP_TURNSTILE_SITE_KEY`, when Turnstile is enabled
- `DESKTOP_RELEASE_S3_FORCE_PATH_STYLE`, set to `true` only when the provider
  requires path-style S3 requests

For signed Windows builds, also configure:

- `WINDOWS_CERTIFICATE_BASE64`, the base64-encoded PFX
- `WINDOWS_CERTIFICATE_PASSWORD`

Without those two signing secrets a manual run can still produce an unsigned
private workflow artifact. An explicitly opted-in unsigned manual test release
can also be published. Tagged releases and normal public publishing runs fail
before release when signing is unavailable or the resulting signature is not
valid.

The storage policy must allow anonymous reads for `desktop/*`, while write
credentials remain private. The pipeline publishes:

- `desktop/Voople-Setup-x64.exe`
- `desktop/Voople-Setup-x64.exe.sha256`
- `desktop/latest.json`
- immutable copies under `desktop/releases/X.Y.Z/`

Set the web deployment's server-only `DESKTOP_INSTALLER_URL` to the public URL
of `desktop/Voople-Setup-x64.exe`. The landing page links to the same-origin
`/download/desktop` route, so the public storage origin can change without a
frontend code change.

## Release

1. Update the version in both desktop manifests.
2. Run all repository checks and a signed installer smoke test.
3. Push the commit.
4. Create and push `desktop-vX.Y.Z`.
5. Verify the GitHub workflow, signature, checksum, install/uninstall flow and
   `/download/desktop` before announcing the release.
