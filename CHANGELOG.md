# Changelog

All notable user-facing changes to Voople are documented here.

## [0.1.11] - 2026-08-10

### Added

- Global chat search across existing conversations, contacts and discoverable public groups.
- Group discovery identifiers, group avatars, invitation links and configurable public/private access.
- Configurable access for group sections, member management and clearer group-owner actions.
- Shared compact call stage with movable minimized mode, camera/screen focus controls and participant tiles.
- Secure account screens for changing email and password in web and desktop clients.
- Developer architecture, workflow and two-device voice-call testing guides.
- Desktop scripts for starting a debug session and fully stopping Voople development processes.

### Changed

- Reworked messenger layout, search mode, conversation rows, composer and message presentation.
- Unified section headers, page spacing, theme tokens and reusable layout components across web and desktop.
- Reorganized settings into focused sections instead of one long scrolling page.
- Improved group management, topic/section creation and invitation flows.
- Improved camera and screen-share composition: content can be fitted, focused or returned to the grid.
- Updated landing page product story and kept profile, feed, shop and event visuals aligned with the app shell.
- Desktop now reuses more canonical web visuals and the same Geist typography assets.

### Fixed

- Removed the empty black area below the messenger, including the larger gap shown during an active call.
- Removed duplicated `Сообщения / Чаты` headings and retained the single `Чаты` title.
- Fixed desktop presigned image, audio and video uploads that previously failed with `Failed to fetch`.
- Fixed missing or stale group avatars and participant presence data in chat surfaces.
- Fixed chat auto-scroll so an opened conversation reaches the newest message reliably.
- Fixed stale microphone indicators and several call-stage sizing, camera cropping and screen-share states.
- Fixed profile feed refresh after post changes, unavailable repost presentation and pinned-post support.
- Fixed inconsistent sticky headers and page padding in messages, notifications, settings and shop surfaces.

### Security and reliability

- Desktop media uploads now use a size-limited native IPC command with MIME, HTTPS host and signature checks.
- Added server-side group/section access checks and rate limits for discovery and invitation operations.
- Presence visibility respects user privacy settings and uses server data as the authoritative source.
- Upload and network-dependent UI paths now expose clearer pending and failure states.

### Deployment notes

- Apply `drizzle/0011_group_public_slugs.sql` and `drizzle/0012_group_avatar.sql` before enabling the corresponding group features in production.
- The Windows installer remains allowed to publish without an Authenticode certificate when the release workflow is explicitly run with unsigned publishing enabled. Tauri updater artifacts are still cryptographically signed.
