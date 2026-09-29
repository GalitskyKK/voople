# Direct Call runtime audit

Audited against `origin/master` at `711c902` (2026-09-29). This is a code and deterministic-test audit, not a two-account media test. Current product behavior is governed by `PRODUCT.md`; the target Core Voice invariant is in `docs/core-rework-architecture.md`.

## Runtime boundary

Direct Calls are still fundamentally backed by **legacy `chat_rooms`**. `chat_rooms` stores one mutable row per DM, `chat_room_participants` stores presence and microphone state, and the LiveKit room is the stable name `chat-${chatId}`. The `chat.room`, `chat.enterRoom`, `chat.leaveRoom`, `chat.heartbeatRoom`, `chat.roomMediaToken`, `chat.incomingCalls`, and `chat.declineCall` procedures use that path. `getChatRoomRest` derives the `ChatRoomView` read model, expires a ringing room after 45 seconds when that specific room is read, and ends an active room when all legacy participants disappear.

`ChatRoomControl`, `useChatRoomControl`, `useVoiceRoomRuntime`, `useVoiceMediaConnection`, `useVoiceHeartbeat`, the media stage, and `VoiceSessionProvider` are **shared UI/media infrastructure**. `useVoiceRoomServerAdapter` selects its `legacy` branch for Direct Calls and its `core` branch only for a Core Group Room descriptor. Sharing these components does not put Direct Calls in Core Voice.

Core Voice uses `group_rooms`, `live_sessions`, `live_session_participants`, Core join/leave/heartbeat/token procedures, and `live-${providerSessionId}` LiveKit rooms. The accepted architecture describes a future DM LiveSession without a Group Room; this is not implemented in the Direct Call route. A migration would replace legacy call persistence, atomic admission/busy checks, session-scoped media identity and terminal reasons. It should retain the shared media/UI controller and preserve compatibility with released desktop clients during rollout.

## State model

`startedAt` identifies the ringing invitation until answer. On answer, the legacy server overwrites `started_at` with the conversation start. `status=active` is a **database transition on answer**, before LiveKit confirms the remote participant. `participantCount` in the sound hook counts database participant rows, not LiveKit participants.

| Persisted status / reason | Caller phase | Callee phase | Media behavior | Sound behavior |
| --- | --- | --- | --- | --- |
| no row or terminal row / no observed call | idle | idle | no connection | quiet |
| `ringing`, caller participant present | dialing | ringing through incoming overlay; answering mounts controller | caller joins LiveKit; callee has not joined | caller `call.outgoing`; foreground callee `call.incoming` |
| `active`, both database participants present | connected | connected | each client connects to LiveKit separately; a side may still be connecting/reconnecting | loops stop when room query refreshes; `call.connected` once per client after local media connects and database count reaches 2 |
| `declined` | ended | ended | room participant rows removed; clients disconnect on room refresh | observed caller gets `call.declined`; rejecting callee gets one local `call.declined` |
| `cancelled` (caller leaves while ringing) | ended | ended/overlay closes | participant rows removed | loops stop; terminal cue quiet |
| `missed` (ring age exceeds 45 s on room read) | ended | ended/overlay expires | participant rows removed if room read; incoming list excludes expired rows | loops stop; terminal cue quiet |
| `ended` (hangup or no remaining participants) | ended | ended | room participant rows removed; clients disconnect on room refresh | `call.ended` only after this client observed a media-connected conversation or confirmed its own leave |

`getDirectCallPhase` maps `active` to `connected` even if media failed, so the label is not proof of two-way audio. A successful local LiveKit connection plus two database participants can likewise play the connection cue before remote LiveKit join. Database `active` may outlive a dead LiveKit connection until leave, heartbeat expiry, or a later room read; heartbeat staleness is three minutes. The UI has reconnect/error states, but server status and media health are distinct facts.

Caller transition: idle → `enterRoom` → ringing/dialing → callee `enterRoom` sets active → local LiveKit connection → leave sets cancelled if still ringing or ended after answer. Callee transition: idle → incoming query → ringing overlay → answer sends `enterRoom` bound to the observed `startedAt` → active → local LiveKit connection → leave sets ended. Decline is bound to the observed `startedAt`. A late answer/decline now fails instead of acting on a later call in the same DM. The old desktop API shape remains accepted without that guard for compatibility.

## Discovery, cleanup and concurrency

Web and Desktop subscribe to all `public.chat_rooms` Postgres changes through Supabase Realtime. Subscription and `SUBSCRIBED` events invalidate `chat.incomingCalls`; this audit also invalidates `chat.room` so answer/decline/cancel promptly refresh the current call. The incoming query polls every 10 seconds, refetches on window focus, and polls in the background. The active room query polls every 5 seconds while Full is open and every 15 seconds otherwise. If Realtime is unavailable or `chat_rooms` is absent from the publication, those intervals are the latency floor. Incoming results are filtered server-side to direct, unblocked, live-caller rows less than 45 seconds old. The client now expires a cached incoming overlay at that same deadline. There is no dedicated Direct Call timeout cron; a stale ringing database row can persist after both clients close, although incoming listing ignores it and reading that room expires it.

The client auto-declines the first incoming call while `state.inside` is true, including while in a Group Room. The server checks the joining user's other legacy participant rows and active Core participant rows. It does **not** reserve the recipient on call creation or atomically check busy across both participants. A busy recipient can therefore ring until its client auto-declines or timeout; an offline busy client cannot auto-decline. A second incoming call can queue behind the first. Simultaneous cross-calls or double starts across devices can race the `chat_rooms` upsert and participant writes. `useVoiceSessionOperation` prevents a same-controller double join, but not a cross-device/server race. The legacy participant table has no one-active-session-per-user constraint; Core participants do.

The legacy LiveKit room name is reused for every call in a DM. Server state and a still-connected old media session could briefly disagree at a rapid second call boundary. This needs a session-scoped server/media contract, not a UI-only patch. On refresh, in-memory call state is lost: ringing is rediscovered by query, while an active call is not automatically rejoined. The legacy database participant remains until leave or three-minute stale cleanup. LiveKit reconnect uses the current media token path and does not call `enterRoom` again. Unmount disconnects local media without an implicit server leave, allowing refresh recovery but leaving temporary stale server presence.

Blocked pairs are excluded from incoming listing. Direct `enterRoom` and media token creation check current block policy server-side. Notification clicks open `/messages/${chatId}`; the click does not answer and has no call-instance token, so a stale toast may open the DM after the call ends.

## Sound ownership

The incoming overlay owns its managed loop; the caller hook owns the outgoing loop. React effect cleanup stops loops on visibility/phase change and unmount. Incoming notice keys prevent duplicate Desktop native notifications for repeated query updates. The sound progression records one connected and one terminal cue per observed call, and resets on a new call key. `notificationSound=false` suppresses all custom call cues and loops. Foreground Desktop uses the WebView incoming loop; background Desktop stops that loop and uses the native notification sound. Web has no native call notification owner. Browser autoplay can reject playback; visuals and call state continue, and this audit cannot assert audible sound without a browser test.

The connection cue remains an **optimistic conversation cue**: it requires local media plus two database participants, not remote LiveKit media. Cancelled and missed stay quiet because the legacy state alone cannot reliably convey intent. A confirmed local leave and a later terminal room refresh share one resolution guard, preventing duplicate terminal cues.

## Bugs addressed in this slice

1. A delayed decline could end a newer call in the same DM. New clients pass `startedAt`; the server conditionally updates that exact ringing instance. Answer also checks the observed instance and uses a conditional ringing-row update.
2. Realtime changes refreshed incoming calls but not the active call's room query, so caller ringback and remote terminal state could lag until the 5/15-second poll. The existing subscription now invalidates both queries.
3. A cached incoming query could keep its overlay and ringtone visible after the 45-second server cutoff while a refetch was delayed. The client now hides it at the cutoff.

Remaining correctness gaps are the non-atomic legacy start/admission transaction, one mutable row and reusable LiveKit room per DM, non-atomic busy checks, and the lack of proactive ringing cleanup. These are not safely repairable with a client-only change or a small compatibility-preserving patch. No claim is made that two-way calls are reliable in production until the manual matrix below is run.

## Two-account manual verification

Use two clean accounts A and B, confirm neither is blocked, use a short call timeout window, and capture server `chat_rooms`/participant status alongside the visible phase and heard cues. For **each** row, run: call A→B; answer; talk both ways; mute/unmute both sides; hang up from A then B on separate runs; decline from B; cancel before answer from A; wait for timeout; immediately place a second call in the same DM. Verify incoming and outgoing loops stop, connected/terminal cues play at most once, and no old audio leaks into the second call.

| A → B | Additional check |
| --- | --- |
| web → web | browser autoplay blocked and allowed; tab refresh while ringing and while connected |
| desktop → web | foreground/background Desktop caller; web receiver network interruption |
| web → desktop | Desktop receiver focused then background; native/custom sound never overlap; notification opens correct DM |
| desktop → desktop | both foreground and background combinations; native notifications on receiver |

Across the matrix also test double-click start, simultaneous cross-call, B already in another Direct Call, B already in a Group Room, a second incoming caller, stale ringing rows, temporary network loss, LiveKit reconnect, remote disconnect, and local/remote leave. Check light/dark themes and 360 px mobile web overlay. These scenarios were **not** executed in this audit.

## Recommendation

**B. Migrate Direct Calls to Core Voice in a separate future PR.** The shared controller and media path are reusable, but the legacy one-row call lifecycle lacks atomic call admission, a database-enforced cross-runtime busy invariant, and session-scoped media identity. The fixes here close concrete stale-action and notification-latency bugs without changing the architecture. Migration should be driven by the two-account findings and retain a supported-old-client compatibility plan.
