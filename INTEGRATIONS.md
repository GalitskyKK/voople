# Integration strategy

Integrations are adapters around the shared profile/status model. OAuth tokens,
provider secrets, local process paths and raw window titles never enter shared
React components or public telemetry.

## Music presence

The preferred desktop MVP is provider-neutral Windows media presence through
`GlobalSystemMediaTransportControlsSessionManager`: read the opted-in current
session's title, artist, artwork and playback state, then publish a short-lived
Voople activity. This supports compatible Spotify, Yandex Music and browser
players without sharing audio or storing listening history by default.

Spotify OAuth can later add cross-device now-playing and deep links using the
`user-read-currently-playing` scope. Do not rebroadcast Spotify audio. Treat
Spotify development quota/user allowlists as a launch constraint, not an
implementation detail.

Yandex Music currently has no supported public consumer API suitable for a
production Voople integration. Do not ship reverse-engineered private APIs.
Use Windows media sessions on desktop and offer a manual track/deep-link status
on web until Yandex publishes a stable partner API.

## Game activity

Desktop activity detection must be opt-in and local. The native adapter may
enumerate process executable names, match them against a signed Voople game
catalog, and allow the user to manually register or hide a running game. Only a
normalized game ID, display name and start timestamp leave the device. Never
upload arbitrary process lists, executable paths or window titles.

Game SDK/Rich Presence is a second path: a game explicitly supplies its own
activity details to Voople. Steam/Xbox/PlayStation connections are separate
OAuth/provider signals and are not required for local executable detection.

## Candidate order

1. Windows media presence with privacy controls and an activity timeout.
2. Local game catalog, manual add/hide and per-game visibility.
3. Spotify OAuth only after quota access is viable.
4. Calendar, GitHub and streaming-service connections after a common encrypted
   token vault, revoke flow and scope review exist.

## Product decision (August 2026)

The first integration is Windows media presence. It is the smallest useful
provider-neutral slice and does not depend on Spotify quota approval or an
unsupported Yandex Music API. The setting must be opt-in, expose a one-click
pause/hide control, expire stale activity and publish only normalized track
metadata. Implementation belongs in the Tauri native adapter; shared React UI
consumes a provider-neutral activity view model.

Game detection follows only after the same privacy controls and TTL behavior are
proven. OAuth token vault work is deliberately not started by either MVP.
