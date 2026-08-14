# Voople desktop roadmap

This document tracks work that is intentionally desktop-only and must not be
implemented as a divergent copy of the shared web UI.

## P1 — application audio during screen sharing

### Current implementation state

- Web and the standard desktop release request audio belonging to the selected
  browser tab or window through `getDisplayMedia`. The full system mix remains
  excluded, and Chromium receives the best-effort `restrictOwnAudio` constraint.
- Browser/WebView support varies. If the selected surface does not provide an
  audio track, screen video still starts and the UI reports a video-only fallback.
- This fallback is the permanent web implementation. It is not a replacement
  for desktop process isolation because it cannot guarantee application-window
  audio across browsers or follow a Windows process tree.
- Tauri already exposes capability detection and a source selector. The experimental Rust module
  enumerates audio sessions, captures a selected process tree and publishes a separate LiveKit
  `ScreenShareAudio` track without sending PCM through IPC.
- `process-audio-publisher` is feature-gated because the current `webrtc-sys/cxx` generated C++
  does not compile reliably with the GitHub/MSVC toolchain. Production CI must not enable it until
  that build is reproducible; unsupported builds retain selected-surface browser
  audio when available and otherwise show an explicit video-only fallback.

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

### Implemented release candidate

The signed updater metadata now receives the matching section from
`CHANGELOG.md`. After `downloadAndInstall` succeeds, Tauri records the verified
`previousVersion -> installedVersion` transition in the application data
directory. On the next launch, desktop shows the safe structured `Что нового`
dialog once and keeps up to 20 locally installed versions in Settings → Window.
Fresh installs have no transition and therefore do not show a false update.
Updater checks and the release-note dialog are mounted outside the authenticated
application shell, so a signed update is available on the login screen as well
as after authentication.

After a successful in-app update, show a shared `Что нового` dialog once for
that installed version. A fresh install must not pretend that it was updated,
and ordinary restarts must not reopen an acknowledged release.

- The native updater records `previousVersion -> installedVersion` only after
  a verified update succeeds. This is implemented by
  `desktop/src-tauri/src/release_notes.rs`.
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

## P4 — product-wide architecture and component refactor

Refactor the whole web/desktop product incrementally after the current release,
without a flag-day rewrite. The goal is one canonical implementation for each
domain concept, smaller reviewable modules and explicit dependency boundaries.

### Architecture discovery

- Inventory routes, shared UI, domain components, hooks, server services, data
  modules and Tauri adapters; record duplicate concepts and dependency cycles.
- Measure component/module size, bundle ownership, rendering cost and change
  frequency before choosing new boundaries.
- Evaluate Feature-Sliced Design as an organizational tool, not as a mandatory
  folder-template migration. Adopt useful layers (`app`, `pages`, `widgets`,
  `features`, `entities`, `shared`) only where they improve the existing
  `app -> components -> hooks/lib/types` and server-service architecture.
- Write an Architecture Decision Record before changing the repository-wide
  structure. It must define dependency rules, public module APIs, naming,
  migration order and exceptions for Next.js App Router and Tauri.

### Incremental migration

1. Extract stable design tokens and canonical primitives for headers, panels,
   navigation, profile identity, media and asynchronous states.
2. Split oversized components into domain hooks, state machines and focused
   views while preserving observable behavior and accessibility.
3. Replace desktop copies with shared domain views; keep only native I/O,
   authentication, routing and lifecycle adapters under `desktop/`.
4. Move server authorization and business rules into services, persistence into
   data modules and external providers into integrations; keep routers thin.
5. Add architecture checks that prevent cross-layer imports and creation of a
   second canonical component for an existing concept.
6. Migrate one vertical slice at a time behind tests and visual snapshots. Do
   not combine structural moves with unrelated product behavior changes.

### Completion criteria

- Web and desktop render canonical shared views for every portable domain.
- No React component exceeds the repository limits; existing baseline debt is
  eliminated rather than raised.
- Architecture documentation contains a current module map, extension recipes
  and decisions understandable to a new contributor.
- Web/desktop visual regression, unit, contract and E2E suites cover every
  migrated slice at desktop and mobile widths in both themes.
- Bundle ownership and startup metrics do not regress during the migration.
