# Core Direct Call rollout and verification

## Activation boundary

`core_direct_calls` is a dedicated internal-only server capability. It is absent by default from `VOOPLE_SERVER_CAPABILITIES`, and both DM members must be in `VOOPLE_INTERNAL_USER_IDS`, so new Web and Desktop continue the legacy Direct Call contract on stable. The new client asks `chat.coreDirectCallCapability` before selecting a runtime. A server without the new procedure fails closed to legacy. While a Core call is already active, the capability query remains enabled for its participants after the start switch is removed, allowing them to finish or reconnect. The existing `chat.room`, `chat.enterRoom`, `chat.leaveRoom`, `chat.heartbeatRoom`, `chat.roomMediaToken`, `chat.incomingCalls` and `chat.declineCall` procedures remain installed.

The Core path is **not ready for stable activation**. The released Desktop 0.1.49 request for `enterRoom` and `declineCall` can carry `startedAt`, but `leaveRoom`, `heartbeatRoom`, `roomMediaToken`, and `roomScreenAudioToken` carry only `chatId`. A server bridge cannot distinguish a delayed old-client leave/heartbeat from the same action on a later Core call in that DM. Mapping those calls to an active Core session could end or mutate the newer call, violating the immutable session identity requirement. A shadow `chat_rooms` row would provide old-client Realtime invalidation but would not solve this stale-action ambiguity. This is why the capability must remain disabled for stable users until 0.1.49 is no longer eligible to join a Core call, or a versioned session-bound compatibility contract is available.

Before any guarded activation, confirm the migration is applied, the minute maintenance route has `CRON_SECRET`, and the environment capability is enabled only for a cohort whose clients all send session IDs. Never enable Core start for a user whose recipient may still use 0.1.49. The server cannot currently prove that condition, so ordinary rollout remains blocked. Do not infer client version from a user agent or allowlist of account IDs alone.

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
| New Web | Desktop 0.1.49 | Capability off: legacy call delivery and audio | Pending |
| Desktop 0.1.49 | New Web | Capability off: legacy incoming normalization | Pending |
| New Desktop | Desktop 0.1.49 | Capability off: native notification and legacy media | Pending |
| Desktop 0.1.49 | New Desktop | Capability off: native notification and legacy media | Pending |

Also run concurrent A→B and B→A, A→B from two tabs, C→B while A→B rings, each user busy in a Core Group Room and a legacy call, block during ringing, lost start response followed by retry, stale answer/decline/leave from the previous call, terminal token denial, and server timeout while both clients are closed. Check Void/Light at desktop and 360 px. No manual row is marked passed until performed with the corresponding clients and a real LiveKit service.
