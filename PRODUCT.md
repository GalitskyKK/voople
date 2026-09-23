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

The default Group tab is **Войс**. Tabs are **Войс / Чат / Люди**.

- Войс shows Lobby, active and pinned Rooms, screen-share state, planned Rooms
  where available and members who can join.
- Чат is the persistent Group Conversation. Optional legacy text Sections stay
  supported but are not the primary Group model.
- Люди shows membership, privacy-permitted presence and relevant actions.

## Core voice actions

- **Join / Switch:** clicking another Room joins or switches directly. It does
  not automatically open Full Room. The current Room has an explicit Expand
  action; clicking it may also expand.
- **Split:** requires an actual active LiveSession. It creates a temporary Room
  and atomically moves the initiator. Server authorization and source-session
  freshness are mandatory; a client check is only an interaction aid.
- **Voop:** asks a specific person to step away. The temporary Room is created
  only after acceptance, and the request is bound to the inviter's active
  source LiveSession.

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

## Beta profile

The profile is an identity and contact surface: avatar, banner, name,
username, bio, privacy-permitted presence, common Groups, message/Voop and
owned cosmetics or badges. Status/music may appear only where enabled.
Posts, feed tabs, Questions, follower metrics and profile-view metrics are
deferred, with their data and API preserved.

## Group Economy

The social core stays free, including basic Groups and Rooms, ordinary voice
and screen share, Split, Switch, Voop and invitations. Personal Voople+,
Group+, Group+ Day, shared contributions, permanent assets and earned Group
identity are secondary or future layers. They cannot gate the core loop.
Promotional acquisition is specified in `docs/product-monetization.md`; no
fingerprinting or reward engine is part of the current beta slice.

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
