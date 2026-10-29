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

**Орбита** is the default interface; Appearance settings also offer
**Классический**. Explicit Classic choices remain selected. Selection is free, device-local and
independent of color themes. Switching presentation never ends a LiveSession.
Orbit keeps a stable compact Group rail. Its personal-message destination opens
/messages: a dedicated inbox with one persistent named conversation column.
Selecting a DM keeps that same column. Personal messages use the Group workspace
geometry: a shared header row, one framed body containing the DM list and chat,
and consistent dock/composer alignment. The left header is Личные сообщения
with a plus; the right header identifies the peer. A privacy-filtered peer info
pane appears on wide workspaces or through its header toggle. It reuses the
canonical profile card and does not invent unsupported media counts.
Group avatars remain available, and explicit rail expansion never changes the
DM column into another navigation design. Its header plus opens the existing
contact search/open-direct flow; search overlays remain above this column.
Large Room covers stay in two columns.
The desktop account/call dock spans the rail and full context column, aligned
with Rooms or the DM list. Settings and Help have direct shortcuts; Profile
and Logout remain in the canonical account menu. Profile, Settings and other
routes use the same outer workspace width; their internal reading widths and
left controls reserve space above the dock.
On mobile Orbit, Compact is a draggable 64px floating call tile showing the
active speaker's canonical avatar and microphone state. Tapping opens the
existing call controls in a bottom sheet. Speaker changes, controls and call
start/end never reserve variable page height or resize the chat. The tile stays
clear of the composer and bottom navigation. Full and Mini keep their existing
meaning and media lifecycle. Mobile retains Profile in bottom navigation.
Room names remain visible; the current Room rests slightly larger with participant circles and a
subtle blue cover outline/glow that persists while another Room is previewed.
Hover, keyboard focus or an explicit touch control enlarges its cover about
the same centre by only about 10–16%; neighbours shrink slightly with fixed
centres and retain their slots. The shared Voice/Chat/People content area below
the contextual header and tabs has a thin blue frame in both themes. The header
stays outside this frame. On desktop, the Group identity/menu belongs to the
local Voice/Chat/People workspace header, aligned with the selected chat name
(such as # Общий) and its existing section picker; action buttons sit to the right.
A real Group banner extends behind the Group title to its former bottom edge in
the Rooms column. The title block gains local blur on hover/focus/open menu,
while the lower artwork remains sharp. Touch retains a readable title scrim.
No blank banner area is reserved when no custom banner exists. Native Orbit
retains the local row below its unchanged OS titlebar without duplicate Group chrome.
The Rooms section heading is visually omitted in Orbit;
one accessible plus button opens the same persistent-Room creation flow from
the Group identity area on desktop or the tab bar on compact layouts, without
an extra Rooms toolbar row. Orbit omits the duplicate Group header avatar and
shows a Group banner only when a custom one exists. Compact content uses
symmetric margins and a centred Room grid. Room compositions remain borderless: title above, translucent
entry glyph on the cover only on hover/focus. A top-right gear reveals separate Room action buttons
to the right of the cover, allowed to extend over the adjacent pane. They stay
inside the device viewport. Up to four avatars cluster on the lower edge with a +N overflow badge and become a
bounded participant popover below the cover, over the lower Room row. Visible
zero/empty/current narration and duplicate join labels are omitted. The same
join/switch/expand rules apply on pointer/keyboard. On a coarse-pointer Orbit
client, the first tap previews a Room; a separate explicit entry/switch/open
button performs the voice action. Tapping outside dismisses the preview.
In Orbit calls, audio-only participants use square identity tiles in a stable
grid. Mobile keeps two columns and sizes tiles to the available height, with
internal scrolling only when readable minimums cannot fit everyone. Pointer or
keyboard focus enlarges a tile subtly without changing its centre or sorting
participants by speech. Speaking uses a quiet Ice signal. Right-click, Shift+F10
or an explicit touch action opens separate volume/action surfaces beside the
tile, clamped to the viewport. Video and screen-share retain the shared grid/focus
media layout and the same call runtime.
Room owners and Group administrators can choose a built-in cover or upload an
image during creation and change it afterward. Covers are shared Group identity;
uploaded cover files use public asset storage, like Group avatars.

The default Group tab is **Войс** on compact windows and mobile; tabs are
**Войс / Чат / Участники**. On wide desktop, one Group workspace shows Live Rooms,
the persistent Group Conversation and People together. Medium desktop shows
Live and Chat together, with People available as an on-demand side panel.

- Войс shows Lobby, active and pinned Rooms, screen-share state, planned Rooms
  where available and members who can join.
- Чат is the persistent Group Conversation. Optional legacy text Sections stay
  supported but are not the primary Group model.
- Участники shows membership, privacy-permitted presence and relevant actions.

## Core voice actions

- **Join / Switch:** activating another Room joins or switches directly (after
  the explicit entry button on touch Orbit clients, as described above). It does
  not automatically open the expanded Room in either interface. Join shows Compact;
  the current Room or dock has an explicit Open action. In Orbit, this opens the
  existing Room presentation in the Group working area while retaining Rooms.
  The workspace channel title becomes the Room name, Group People hides behind
  a top-right toggle, and secondary Room controls move to the bottom. They
  reveal on hover/keyboard focus and remain available on touch. Connection
  quality belongs to the persistent call dock. Only the fullscreen control
  takes the viewport. Mobile can return to Rooms with the header back action.
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

The personal-plan foundation stores independent Style/full grant facts and
provides an authenticated self read. Simultaneous coverage is representable
without selecting an effective plan. Trusted server/admin Style fulfillment and
revocation are available; no billing adapter, subscriber
migration or included Group charge issuance is connected. Paid app themes are the
first Style capability consumer: selection requires active legacy subscription OR
Style coverage; Full is explicitly ignored. Void, Light and clear remain free.
Saved paid themes survive expiry/revocation, render as Void while denied, and
reactivate when access returns. Explicit free selection replaces that preference.
Premium nickname fonts are the second Style consumer: `sans` is free; selection
of `serif`, `rounded`, `mono`, `display` and `soft` requires legacy OR Style,
with Full ignored. Saved premium fonts survive entitlement loss, render as
`sans` while denied and reactivate on restoration. Explicit `sans` replaces
the preference. Published appearance snapshots preserve their captured font,
including in reposts, independently of current author entitlement. PostgreSQL
blocks direct browser premium-font writes. Premium nickname effects are the
third Style consumer: `plain` is free; `gradient`, `neon`, `highlight`, `outline`
and standalone gradient=true require legacy OR Style, ignoring Full. Saved
effect/gradient facts survive access loss; live presentation becomes plain with
gradient=false, and restoration reactivates the retained choice. Explicit plain
replaces it and clears gradient. Historical appearance snapshots stay captured.
Migration 91 blocks browser premium effect/gradient writes. Custom nickname color is the fourth accepted Style consumer: the seven free palette colors and reset remain free; any other exact six-digit HEX requires legacy OR Style, with Full ignored. Saved custom colors survive entitlement loss, render with default/null foreground while denied and reactivate on restoration. Published appearance snapshots preserve captured effective colors. Migration 92 blocks direct browser custom-color writes. Profile/card styling is the fifth accepted Style slice: premium recognized frame presets, custom frame color, premium card base and profile palette each use an explicit legacy OR Style capability, ignoring Full. Saved preferences survive access loss; live fallbacks are no premium frame, null custom frame color, mirror card base and the canonical default palette. Free frames and owned Store frames retain their contracts; subscription-required Store items remain legacy-only. Historical snapshots stay captured. Migration 93 protects browser writes. See `docs/style-profile-card.md`. Uploaded custom banners, wallpaper and other deferred capabilities remain unchanged. The
database blocks browser theme inserts/changes; trusted server mutations recompute
authorization. See `docs/style-app-theme.md`.

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

Expanded Orbit calls keep minimize/close and Group chat in the upper-right,
fullscreen in the lower-right with an enter/exit icon, and one consistent set
of media/secondary controls at the bottom centre. Native fullscreen omits the
Room directory. The participant destination uses an icon and Участники tooltip.
The Group conversation drawer keeps its composer above mobile call controls.
