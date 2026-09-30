# Core Direct Call rollout and verification

## Activation boundary

`core_direct_calls` is available on stable for Web and Windows only when `VOOPLE_SERVER_CAPABILITIES` contains `core_direct_calls`. The capability remains absent by default, so a deployment without it fails closed. Stable users do not need `VOOPLE_INTERNAL_USER_IDS` to start a Core Direct Call. The new client asks `chat.coreDirectCallCapability` before selecting a runtime. A server without the new procedure falls back to legacy. While a Core call is already active, the capability query remains enabled for its participants after the start switch is removed, allowing them to finish or reconnect. The existing `chat.room`, `chat.enterRoom`, `chat.leaveRoom`, `chat.heartbeatRoom`, `chat.roomMediaToken`, `chat.incomingCalls` and `chat.declineCall` procedures remain installed.

**Do not merge this stable activation PR until Desktop 0.1.50 is published and `VOOPLE_MIN_DESKTOP_VERSION=0.1.50` is configured in production.** Migration 78 must also be promoted before activation. Desktop 0.1.49's `leaveRoom`, `heartbeatRoom`, `roomMediaToken`, and `roomScreenAudioToken` carry only `chatId`; they cannot safely resolve a later Core session in the same DM. Legacy chatId procedures therefore remain on `chat_rooms` and never locate or mutate a Core LiveSession. Desktop 0.1.50 sends its packaged version in `X-Voople-Desktop-Version` and `core-direct-v1` in `X-Voople-Voice-Protocol`; Core start requires this protocol for callers from trusted Tauri Origins. Web uses the deployed Core code path. The protocol check alone does not prove the recipient's installed version; the global minimum supplies that boundary.

`VOOPLE_MIN_DESKTOP_VERSION` is a server-only switch, **unset by default**. When unset, Desktop 0.1.49 keeps its legacy Direct Call functionality. Once explicitly configured with a semver release, authenticated requests from production Tauri Origins below that version, with malformed versions, or without a version fail with `VOOPLE_DESKTOP_UPDATE_REQUIRED` (tRPC `FORBIDDEN`; REST HTTP 426). Browser requests cannot claim Desktop status by adding headers. The new Desktop shows a blocking update-required state and invokes the existing signed Tauri updater. The updater reads `desktop/latest.json` from the release asset endpoint, independently of authenticated Voople APIs. Old 0.1.49 has no new blocking UI; its API calls fail closed after the switch, while its signed updater remains available. A trusted Origin is a transport boundary, not cryptographic device attestation; authentication remains the user identity.

## Safe rollout sequence

1. Promote migration 78 and verify the minute maintenance route has `CRON_SECRET`.
2. Publish Desktop 0.1.50 with session-bound Core calls and version/protocol headers; verify signed updater discovery and installation from released 0.1.49.
3. Run the internal two-account Core matrix below for new Web and Desktop clients.
4. Configure `VOOPLE_MIN_DESKTOP_VERSION=0.1.50` in production. Verify Desktop 0.1.49 is forced to update and cannot use authenticated voice APIs; verify Desktop 0.1.50 and Web still work.
5. Only after steps 1–4, merge this stable activation PR. Enable `core_direct_calls` in `VOOPLE_SERVER_CAPABILITIES` on the intended production deployment to allow stable starts.
6. Monitor starts, stale actions, update adoption, media, and terminal cleanup. Roll back by removing Core capability; retain the additive database migration.

Do not infer eligibility from User-Agent or internal account IDs alone. The minimum-version switch must not be set until the signed release and updater adoption path are verified. This PR does not set production environment variables or bump Desktop's version.

## Rollback

Remove `core_direct_calls` from `VOOPLE_SERVER_CAPABILITIES` to stop new Core starts. Existing session-bound Core procedures remain available for participants while calls drain. Wait for all `live_sessions.kind = 'direct_call' AND ended_at IS NULL` rows to become terminal before stopping the Core timeout maintenance. Retain the additive migration and data. Legacy Direct Calls continue through their existing procedures. Do not delete sessions or reset the global release channel.

## Manual matrix (pending)

Use two accounts and record the call session ID, provider room name, server status, local media status, heard cues, and timeline rows. For every pair below run: start; answer; two-way audio; mute/unmute on both sides; caller hangup; callee hangup on a separate call; decline; caller cancel; timeout; immediate second call; refresh caller and callee during ringing; refresh each side after answer; disconnect and reconnect media; and verify a background Desktop incoming notification where either receiver is Desktop. Check one connected cue and at most one terminal cue per side, no overlapping ring loops, and no media from the first call in the second call.

| Caller | Recipient | Additional check | Status |
| --- | --- | --- | --- |
| New Web | New Web | 360 px web and browser autoplay blocked/allowed | Pending |
| New Desktop | New Web | Background caller, foreground Web recipient | Pending |
| New Web | New Desktop | Foreground/background native notification ownership | Pending |
| New Desktop | New Desktop | Both focused and both background | Pending |
| New Web | Desktop 0.1.49 | With minimum 0.1.50, old Desktop must update before using authenticated voice APIs | Pending |
| Desktop 0.1.49 | New Web | Old Desktop is rejected at the minimum-version boundary | Pending |
| New Desktop | Desktop 0.1.49 | Old Desktop is rejected at the minimum-version boundary | Pending |
| Desktop 0.1.49 | New Desktop | Old Desktop is rejected at the minimum-version boundary | Pending |

Also run concurrent A→B and B→A, A→B from two tabs, C→B while A→B rings, each user busy in a Core Group Room and a legacy call, block during ringing, lost start response followed by retry, stale answer/decline/leave from the previous call, terminal token denial, and server timeout while both clients are closed. Check Void/Light at desktop and 360 px. No manual row is marked passed until performed with the corresponding clients and a real LiveKit service.
