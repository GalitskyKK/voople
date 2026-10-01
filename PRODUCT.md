# Voople — current product contract

Updated: 2026-09-23.

This is the single canonical source for current product behaviour and beta
scope. Older rework and social plans are historical references. Technical
invariants live in `ARCHITECTURE.md` and `docs/core-rework-architecture.md`;
presentation lives in `DESIGN_SYSTEM.md`.

## Product

Voople is a private live space for persistent friend groups. The recurring
use case is: open a Group, see its current voice state, join or start a
conversation with little coordination, and return to the same Group later.

## Core entities

- **Group** is a stable friend company with membership, identity, a Group
  Conversation and Rooms. Frequent subsets do not automatically become Groups.
- **Room** is a live placement inside a Group. Lobby is permanent; pinned Rooms
  persist; Split and Voop may create temporary Rooms.
- **LiveSession** is one concrete voice, video and screen-share lifecycle.
  A Room can exist without one; a user has at most one active LiveSession.
- **Conversation** owns persistent Group or DM message history. Rooms do not
  create a second message history; Room context may be attached to messages.
- **Invite** admits a Group member, an exact Room guest or an allowed external
  cohort according to its explicit scope.

## Group navigation

The default Group tab is **Войс** on compact windows and mobile; tabs are
**Войс / Чат / Люди**. On wide desktop, one Group workspace shows Live Rooms,
the persistent Group Conversation and People together. Medium desktop shows
Live and Chat together, with People available as an on-demand side panel.

- Войс shows Lobby, active and pinned Rooms, screen-share state, planned Rooms
  where available and members who can join.
- Чат is the persistent Group Conversation. Optional legacy text Sections stay
  supported but are not the primary Group model.
- Люди shows membership, privacy-permitted presence and relevant actions.

## Core voice actions

- **Join / Switch:** clicking another Room joins or switches directly. It does
  not automatically open Full Room. The current Room has an explicit Expand
  action; clicking it may also expand.
- **Split:** chooses a subset of participants in the current active LiveSession.
  The initiator stays in the source Room while consent is pending. After all
  selected people accept, one temporary Room is created and the subset moves
  together. Decline or timeout leaves everyone in place. The beta picker
  selects 1..N current registered participants; guests are not selectable yet.
  The server owns one persisted consent aggregate and moves everyone atomically
  only after every selected person accepts.
- **Voop:** the one-person shortcut for asking someone to step away. The
  temporary Room is created only after acceptance, and the request is bound
  to the inviter's active source LiveSession. Instant Voop requires an explicit
  future server-checked Group/friend opt-in; default is approval required.
  Server authorization and source-session freshness are mandatory for both
  Split and Voop; client checks only improve feedback.
- Ordinary **+ Комната** always creates a persistent pinned Room. Temporary
  Rooms belong only to consented Split/Voop. An empty temporary Room is hidden
  from ordinary Войс immediately, retained in backend grace for reconnect,
  then archived by bounded maintenance.

Navigating to Chat, People, Profile, Search, DM or another Group does not end
the active LiveSession. Full Room and Mini Room are presentations of that same
runtime. Mini appears only after the user explicitly minimizes Full.

## Guests and invitations

- A Group membership link adds someone to the persistent Group after account
  entry. The default generated link may expire; advanced controls live in
  Group Settings.
- A Room guest link grants access only to its exact allowed Room/LiveSession.
  The guest can receive voice value without mandatory signup and does not gain
  Group membership, Group history or unrelated presence.
- One Room guest link may admit several people from an external friend chat.
  Saving or creating their own Group is optional after useful participation.

## Search and discovery

Search remains in beta for **People** and **Public Groups**. A private Group is
invite-only; an unlisted Group needs a direct link or exact slug; a public
Group can appear in search. Feed, Posts, Questions, hashtags, trending and
the old broad social discovery are preserved in code/data but deferred from
beta navigation. Deferred exposure does not authorize deletion.
The former Interests / Categories / Group Topics taxonomy is retired from
application UI and APIs; its historical database tables remain.

## Beta profile

The profile is an identity and contact surface: avatar, banner, name,
username, bio, privacy-permitted presence, Group tag, common Groups,
Message, Friend and Block, plus owned cosmetics or badges. Voop may appear
only with server-confirmed live eligibility; there is no generic profile Voop
button. Status/music may appear only where enabled and permitted.

Friend means one accepted, bidirectional friendship. A request is a separate
pending/accepted/declined/cancelled lifecycle; reciprocal requests do not
implicitly accept. Block ends friendship and pending requests; unblock does
not restore them. Legacy directed Follow and its backend remain preserved for
deferred social use, but Follow is not the primary beta relationship model.

Posts, feed tabs, composer, pinned posts, Questions, follower/following and
post metrics, and profile-view metrics are deferred, with their data and API
preserved. Beta web and desktop Profile do not load these feed payloads or
subscribe to their realtime events. Common Groups show only Groups already
joined by the viewer; blocked pairs reveal no common Groups.

## Group Economy

The social core stays free, including basic Groups and Rooms, ordinary voice
and screen share, Split, Switch, Voop and invitations. Future personal Voople+
plans and charge-derived Group Grades cannot gate the core loop. The accepted
direction is documented in `docs/product-monetization.md`: full Voople+ includes
one Group charge, additional charges contribute to a Group's Grade, and Group
Night is a temporary acquisition trial. These are not beta billing entitlements.
The former Group+ Day/Month and boost ladder proposals are deprecated.

The Group Grade foundation persists independent charge grants and derives
Basic / Grade I / Grade II / Grade III from 0 / 1–2 / 3–4 / 5+ active charges.
Its member-only read API does not issue charges from existing subscriptions,
convert legacy Boost assignments, or implement billing. Existing Groups without
new charges resolve to Basic. Premium Grade benefits remain unconfigured until
their capability matrix is accepted; free-core access and governance stay unchanged.

## Beta evidence and quality

Primary evidence is a second useful session by the same Group, weekly
recurring voice Groups, W1 Group retention, invite-to-media conversion and
reliable Split / Switch / Voop. Product analytics must exclude message
content, private media identifiers, auth tokens and raw invite secrets.

Web handles public entry and guest preview; desktop is the rich communication
client. Both share product and server contracts. Mobile web remains usable at
360 px. Server state is authoritative for membership, Room placement,
LiveSession eligibility and media credentials. Void and Light, keyboard
access, reduced motion and loading/empty/error/reconnect states are part of
beta quality, not separate features.
