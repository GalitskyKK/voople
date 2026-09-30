# Core Direct Call target state

This is the target lifecycle for a new Direct Call. `live_sessions.id` is the immutable call identity; each attempt also gets a new `provider_session_id`. `started_at` marks the attempt and `accepted_at` marks the conversation duration origin. The direct conversation remains the timeline owner. `chat_rooms` remains a compatibility surface for released Desktop 0.1.49, never a second authority for a Core call.

| Server fact | Caller phase | Callee phase | Core participation | LiveKit | Sound | DM timeline |
| --- | --- | --- | --- | --- | --- | --- |
| No unresolved session | idle | idle | none | none | quiet | none |
| Start request pending | starting | idle | unchanged | none | quiet | none |
| Session `ringing`, deadline in future | ringing | incoming | caller admitted; recipient reserved but not admitted | caller may join `live-${provider_session_id}`; recipient has no token | outgoing/incoming loops by foreground owner | started event once |
| Session `active` after atomic answer | accepted | accepting then accepted | caller and recipient admitted | each connects independently to the same session room | loops stop; connected cue waits for local media and both admitted participants | none |
| Local media connected and both admitted | media connected | media connected independently | both remain admitted | audio may flow; database alone does not prove it | connected cue once per client | none |
| Session terminal, reason `ended` | ended | ended | both released | disconnect | ended cue once only after observed connected state | ended event once |
| Session terminal, reason `declined` | ended | ended | both released | disconnect | declined cue once when known | declined event once |
| Session terminal, reason `cancelled` | ended | ended | both released | disconnect | loops stop; otherwise quiet | cancelled event once |
| Session terminal, reason `missed` | ended | ended | both released | disconnect | loops stop; otherwise quiet | missed event once |

Busy is an admission result and creates no terminal call or timeline record. Start and answer serialize both users in deterministic UUID order and inspect Core participation, Core ringing reservations, and legacy voice occupancy. A retry uses a caller supplied request UUID. Opposite direction simultaneous starts converge on the already ringing session. Answer, decline, cancel, hangup, token and heartbeat carry the immutable session ID; stale actions cannot touch a later call in the same DM. A server maintenance job resolves expired ringing sessions without a client timer.

Recovery reads the unresolved session by authenticated user and conversation. Refresh during ringing reconstructs the same call. Refresh after acceptance reconnects using the existing participant membership and a fresh token for the same provider room. A terminal session can be shown as history but cannot issue credentials or appear as a new incoming call.

Activation requires an old Desktop compatibility bridge that makes the old chat ID procedures resolve to this one Core session and provider room, plus a safe realtime signal for the recipient. If that bridge cannot be completed and tested, Core start must remain disabled for stable clients while the legacy endpoints continue to serve 0.1.49.
