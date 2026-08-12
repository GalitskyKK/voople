# Voople desktop roadmap

This document tracks work that is intentionally desktop-only and must not be
implemented as a divergent copy of the shared web UI.

## P1 — application audio during screen sharing

### Current behavior

- Web and desktop currently publish screen-share video without system audio.
- This prevents remote Voople playback from being captured and sent back to the
  room as a delayed second voice.
- The browser fallback must remain video-only. `getDisplayMedia` does not offer
  a reliable cross-browser way to capture the desktop mix while excluding only
  Voople's own output session.

### Target desktop behavior

Add a native Windows audio-capture adapter in Tauri using per-process WASAPI
loopback or an equivalent supported mechanism:

1. The share picker distinguishes an application window from the whole desktop.
2. Sharing an application can include that application's audio and child
   processes without including Voople playback.
3. Sharing the whole desktop keeps audio off by default. Any broader system
   audio mode is explicit and explains its privacy and echo implications.
4. Captured audio is published to LiveKit as a separate screen-share audio
   track and stops atomically with the matching video share.
5. Device changes, application restarts, reconnects and share cancellation do
   not leak tracks or leave a loopback session running.

### Acceptance criteria

- Spotify/game/browser media is audible remotely when its application is shared.
- Remote participant voices never return through the shared-audio track.
- Microphone mute and per-participant output volume do not alter shared media.
- Windows 10 and 11 are covered, including multiple output devices and Bluetooth.
- The UI always shows when application audio is being captured and offers an
  immediate independent stop control.
- Two-device tests cover headphones and speakers, reconnect, source switching
  and entering/leaving the room. Add the cases to `VOICE_TESTING.md` before
  enabling the feature by default.

### Architecture boundary

The Rust/Tauri layer owns process discovery and loopback capture. Shared React
components only request a source, display capture state and publish the returned
track through the existing voice session. Do not add a second desktop voice-room
implementation. Keep the current echo-safe options in
`src/components/chat/voice/voice-room-config.ts` until every acceptance criterion
passes.

## P2 — release notes after an update

After a successful in-app update, show a shared `Что нового` dialog once for
that installed version. A fresh install must not pretend that it was updated,
and ordinary restarts must not reopen an acknowledged release.

- The native updater records `previousVersion -> installedVersion` only after
  a verified update succeeds.
- Release notes come from the signed updater metadata or a versioned CDN JSON
  document. Render allowlisted structured blocks/Markdown, never arbitrary HTML.
- The dialog is keyboard accessible, scrollable at 360 px, supports safe
  external links and records acknowledgement locally.
- Settings exposes a release-note history and a manual `Проверить обновления`
  action. Web may link to the same history but does not own native update state.
- Missing or malformed notes never block startup and are reported through the
  privacy-safe telemetry boundary.

## P3 — local music and game presence

Implement the native adapters specified in [INTEGRATIONS.md](./INTEGRATIONS.md):
Windows media sessions first, then an opt-in signed game catalog with manual
add/hide controls. Shared UI consumes normalized activity only; native process
paths and the complete process list remain on the device.
