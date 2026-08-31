# Core rework architecture

Status: accepted foundation for the staged core rework. This document turns
`rework_plan/VOOPLE_CORE_REWORK_PLAN.md` into implementation invariants without
making the new shell public before its data contracts are ready.

## Aggregate model

The existing root `chats` row with `type = group` remains the stable Group ID
during the migration. Child `chats` rows remain optional text sections. This
avoids changing every membership, role, discovery and moderation foreign key in
one release. A separate Group table may be introduced later only through an ADR
with a measured benefit.

The target live model is additive:

```text
root group chat
├── text sections (existing child chats)
├── group_rooms
│   ├── lobby
│   ├── temporary
│   └── pinned
└── live_sessions
    └── live_session_participants
```

`group_rooms` owns durable room identity. `live_sessions` owns one concrete
voice/video/screen-share lifecycle. The legacy `chat_rooms` and
`chat_room_participants` tables remain untouched until the compatibility adapter
has shipped and old desktop versions have left the supported window.

## Invariants

1. Every root group has exactly one non-archived Lobby.
2. A room has at most one non-ended live session.
3. A user has at most one participant row without `left_at` across all live
   sessions. The database enforces this across devices.
4. DM calls use a LiveSession without a Group Room.
5. Group live sessions always reference a Group Room.
6. Moving between rooms in one group atomically leaves the old session and
   joins the new session without an intermediate user confirmation.
7. Moving from a DM call to a group room requires explicit confirmation.
8. Empty temporary rooms enter a grace state before the room is archived.
9. Authorization and presence privacy are evaluated on the server. A hidden
   client surface is never an authorization boundary.

## Messages and room context

Rooms do not own messages. Messages continue to belong to a DM, the root Group
Chat or one of its text sections. A one-to-one `message_room_contexts` record
may attach a Room and LiveSession to a message while storing immutable room-name
and room-kind snapshots.

The snapshot is intentional: a temporary room can later be archived or removed
without erasing the context shown in history, search, pins, replies or media.
A Room side panel is a filtered view of Group Chat messages with that context;
it is not a second message history.

## Feature availability

Product exposure is described once in
`src/lib/product/feature-availability.ts`. A feature has:

- an exposure: `primary`, `secondary` or `hidden`;
- allowed platforms;
- allowed release channels;
- an optional server capability requirement;
- a safe fallback route.

Do not hide unfinished features with CSS or scattered platform checks. Route
composition must avoid eager imports for hidden features, and the server must
reject disabled mutations independently of client navigation.

Secondary data and domain contracts are preserved. A legacy presentation may
remain behind an internal rollback flag for one cutover window, then it is
removed from main; Git history is the long-term archive, not dead production
code.

## Compatibility and rollout

The server-owned Group Now read model is the compatibility boundary during the
dual-read window:

- only a member of the root Group can request it;
- Room placement is filtered by each participant's `roomsScope` before a view
  model is built, while the separate online list uses `onlineScope`;
- an active LiveSession is authoritative when the same user is also reported
  by the legacy heartbeat tables;
- legacy root presence maps to Lobby and legacy section presence receives a
  stable compatibility Room identity;
- only current Group members are admitted from either presence source.

The read model remains an internal server contract until the capability-gated
shell has complete loading, empty, error, offline and responsive states. It is
not exposed by a public procedure merely because the tables and mapper exist.

The rollout order is:

1. additive schema and typed contracts, with no public UI change;
2. dual-read compatibility adapter and idempotent Lobby backfill;
3. internal new shell using the new read model;
4. internal multi-room create/join/switch/leave flows;
5. web beta, then desktop beta after parity evidence;
6. stable default after rollback, telemetry and old-client gates pass;
7. legacy table/UI retirement in a later migration.

Each transition is `off -> internal -> beta -> stable`. Rollback disables the
new surface without deleting Room, LiveSession or message-context data. The
server accepts the previous supported desktop contract throughout the rollout.

## Deferred surfaces

Posts, Events, Store, Voople+, public discovery and recommendations keep their
data and domain code but do not define the primary messenger navigation. They
may remain secondary or web-beta surfaces. Account security, privacy, legal,
notifications and recovery are never hidden.

## First implementation slices

1. Foundation: tracked source gate, feature availability registry and additive
   schema.
2. Read model: Groups, Lobby, Rooms, participant presence and privacy filters.
3. Mutation model: create, pin, archive, join, switch and leave with concurrency
   tests.
4. Shared shell: compact navigation, Global Now and Group Now behind an internal
   flag.
5. Room and messenger integration, followed by the staged rollout above.

No schema-only slice is called product-complete. The delivery matrix remains the
gate for authorization, states, web/desktop parity, responsive behaviour and
automated/visual evidence.
