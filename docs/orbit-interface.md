# Orbit interface

Accepted implementation of the Orbit redesign, updated 2026-10-29. Operate mode:
quickly choose a Group or Room while keeping the Group conversation usable.

Scope is Orbit presentation only. [PRODUCT.md](../PRODUCT.md) owns
behavior; [ARCHITECTURE.md](../ARCHITECTURE.md) and
[core-rework-architecture.md](core-rework-architecture.md) own technical
invariants; [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) owns presentation. Orbit
inherits Geist, semantic materials and canonical identity components. Cover
pigments belong to Room artwork and do not replace the shell palette.

## Presentation

Appearance settings select Classic or Orbit independently of app theme. Orbit
is the default for absent/older/invalid interface preferences; an explicit Classic
choice is preserved. Both clients use the same
views, tokens and device-local preference; no new social navigation is exposed.
The main Voice/Chat/People content area has a single 1px frame using 55% Ice mixed
with the material border, with the shared material radius. The contextual header
and compact tab navigation remain above and outside that frame. Column dividers
use a quieter 35% Ice mix.
Void and Light consume their own semantic Ice/material values rather than
introducing another palette. This outer frame does not enclose individual Rooms.
Compact workspaces have equal 8px side margins and a 4px gap below the tabs.
Mobile Messenger uses automatic gutters on both the document and Rooms scroller,
while feature panels retain internal scrolling. This centres the frame and
two-column Room grid against the viewport. Orbit visually omits the Rooms
heading and create label. One canonical 44px Room-creation icon button retains
its name, tooltip and pending spinner, and is portalled to the existing Group
identity area on desktop or to the compact tab bar. It uses the existing
persistent-Room creation flow and adds no extra toolbar row. Classic keeps its
visible labels and inline creation action.

Compact Orbit navigation is a stable 72px Group rail with explicit 220px
expansion. The personal-message destination navigates to /messages. Its 320px
persistent named conversation column uses MessengerDirectRow and stays unchanged
when selecting a DM. It shares the context-column geometry and materials with
Rooms, rather than opening a popup first. No outside-dismiss/Escape listener or
pane-close button is used. Group navigation remains separately available; loading,
retry and new-message actions remain reachable. Saved Messages retains its existing
availability gate and canonical shortcut.

Group avatar magnification reaches 1.24 at the pointer and falls off nearby;
hit targets stay fixed. Tooltip wrappers fill the target width. Unread/live
badges scale with the Group avatar and a quiet Ice outline identifies the
selected chat. DM identity and names use the existing `MessengerDirectRow`.
Orbit hides the duplicate Group avatar in the contextual identity area. A
custom Group banner extends upward behind the Group title, ending at the same
Rooms-column edge as before. The 52px desktop header belongs to the local
Voice/Chat/People workspace inside `.voople-group-workspace-shell`; it is below
the unchanged native OS titlebar. The existing `ChatSectionsBarView` is portalled
into the right header slot, so the actual selected chat (such as # Общий), section
picker and People action retain one owner. Remaining Group actions sit at the
right; there is no additional generic Chat heading or duplicate section row.
A theme-aware title scrim protects contrast at rest. Hover/focus or an open Group
menu adds 8px backdrop blur in that block over the shared 500ms transition,
without filtering the lower artwork. Reduced transparency uses the material fill.
Compact clients extend the artwork behind their title/tabs and the existing
104px Voice banner area. Touch keeps the title block blurred without requiring
hover. On Chat/People tabs the artwork ends at the header, above the content;
the existing section controls remain in the compact Chat pane. Without a custom
banner, no fallback or blank banner space is reserved.

Rooms retain server/keyboard order. Desktop pointer and keyboard activation
retain direct join/switch actions; coarse pointers preview first (see below). A stable
two-column lens (one column for a single Room) keeps the same cover centres.
The current Room rests modestly larger with a thin Ice cover outline and a weak
soft blue shadow. The signal follows the authoritative current Room, persists
during other previews, and remains distinct from the keyboard focus outline.
Hover, keyboard focus or a details tap
expands a cover slightly about its centre. Resting covers use 38% of the map
width (40% for the current Room) and previews use 44%, roughly 10–16% growth.
A bounded Gaussian falloff shrinks nearby covers by at most 8% without shifting
their centres. There is no packing or
slot reordering. A container-width ResizeObserver is sufficient: animated card
heights and roster sizes never feed the layout state on each animation frame.

The Room composition is borderless, with its title above the rounded square,
a translucent entry/open glyph visible over the artwork only on hover/focus.
A small top-right gear reveals separate floating action rows for entry, eligible
Split and cover editing. They use the existing portalled `DropdownMenu` with
`side="right"` and a 168px minimum width. The root is transparent and borderless;
each action has its own matte surface. Actions may extend across the Rooms pane
into adjacent content. Only viewport collision bounds apply: they flip left
when needed and retain an 8px viewport inset. A weak radially fading 2px backdrop
blur sits beneath the portalled rows, leaving labels and icons sharp. It starts
at the action rows with the same 40px vertical and 32px horizontal fades, so its top halo cannot
reach the section controls. Reduced
transparency removes it. Up to four avatars form one cluster on the lower edge, with
a +N badge for the remainder; they never occupy separate sides. The same
canonical participant nodes become readable floating rows below the expanded
cover. The user explicitly chose this popover overlay over the lower Room row;
its bounded scroll does not push the grid or move neighbouring Rooms. A weak
3px backdrop blur extends up to 112px past both sides and 24px above/below the
focus zone. Derived tile/map bounds keep the aura inside the horizontal map and
below its section controls. Vertical 40px and horizontal 32px fades intersect the broad radial
mask, so the upper edge stays soft without blurring the heading or add-Room
button. Orbit disables scroll anchoring in the Rooms scroller: decorative
overflow and lens resizing cannot shift the viewport away from the selected
cover. The separate action aura remains 2px. The selected cover
and its participant text stay sharp. Reduced-transparency settings remove the blur. Large
rosters use 240px (176px narrow) and every participant remains rendered. The
popover width is clamped inside the pane, independently of the cover width.
Participant popovers have a 176px minimum width, 36px pills on a 40px pitch and
24px canonical avatars. Coarse pointers retain 44px interactive rows/pitch with
a 36px pill drawn inside the target. Compact lower-edge avatar satellites stay
18px; name text stays 12px. One CSS row-step variable drives both transforms
and roster height, preserving the circle-to-row animation and bounded scrolling.

Orbit omits obvious zero/empty/current narration and repeated join labels.
Empty Rooms can still be previewed through the cover or name, revealing the gear
and its permitted actions without an extra empty-state glyph. Pending connection and movement/error feedback remain visible
when useful. Icons keep accessible names. Ownership markers preserve expansion and return focus
across participant menus and cover sheets rendered through portals; Escape is
handled by the owned popup before the map. Existing profile, volume, mute and
consented Voop actions remain; foreign media stays private.

Collapsed roster content is inert. `data-focus-owner` associates portalled
menus/sheets with their trigger. The map handles Escape only for an event
originating within its DOM subtree and not already handled by an inner
control, so owned portalled controls retain their own Escape behavior.

The Compact dock remains a presentation of the existing call runtime. On desktop,
one 8px-inset dock spans the rail and entire 320px context column. Its width is
derived from shared sidebar/context tokens and stays aligned with Rooms or DMs.
The canonical account row persists without a call, with direct Settings/Help.
Standalone conversation headers/stages occupy the space beside that context
column. Dock width, context position and shell navigation transitions share the
same 500ms curve during explicit rail expansion, preserving composer clearance.
All desktop outer workspaces use the same full width. Profile cards and Settings
navigation have bounded scrolling above the dock; their content remains readable
in the adjacent area. Other page scroll surfaces reserve bottom access space.
The People summary heading is Активность.

Mobile Orbit Compact is a draggable 64px tile. The avatar follows an active
participant ID, falls back to the local participant during silence and preserves
canonical avatar/ring/decoration visuals. Microphone and connection state are
visible independently. Tap opens a bottom sheet reusing VoiceCompactSessionDock
with surface=sheet. Neither tile nor sheet measures or reserves a Compact height,
so controls, active-speaker changes and call start/end never resize chat.
Movement is clamped above the composer/navigation and within the visual viewport;
Alt+arrow keys provide a keyboard alternative. Observers/listeners clean up when
the tile unmounts. The existing Full/Mini semantics and authoritative media
runtime are unchanged. Mobile Profile stays in its existing navigation.

## Room covers

Four built-in vector identity covers (Orbit, Arcade, Wave, Dusk) need no external
asset download. Uncustomized Rooms use a deterministic default. Creation and
editing can select a preset or JPEG/PNG/WebP/GIF image up to 5 MiB. Custom uploads
use generated owned `room-cover` keys and public asset storage. The server checks
ownership, stored size/MIME and actual decodability with a 16-megapixel bound.

Migration 94 adds `group_room_covers` with RLS and service-role writes only.
Authenticated/rate-limited mutations enforce membership plus Room creator or
Group admin/owner authorization. The edit RPC rechecks current membership under
lock in the same transaction as the cover update. Create-with-cover wraps the existing atomic
create/join RPC in the same transaction; context rejection rolls back both.
Idempotent retries cannot overwrite a cover changed after creation. Existing
create/join RPCs stay available. Reads tolerate a not-yet-applied cover table;
writes require migration 94. UI verification does not apply remote migrations.

## Implementation ownership

- `src/app/styles/orbit.css` owns the Orbit presentation, radial focus blur,
  responsive rules and reduced-motion/reduced-transparency behavior.
- `src/components/chat/OrbitRoomFocus.tsx`, `OrbitRoomMap.tsx` and
  `src/lib/chat/orbit-room-layout.ts` own presentation selection, container-width
  observation and stable-slot lens geometry, independently of roster height.
  The focus provider also owns outside-pointer dismissal and respects owned popups.
- `src/components/chat/GroupNowRoomSection.tsx`, `OrbitRoomMenu.tsx`,
  `RoomRosterDisclosure.tsx` and `GroupNowParticipant.tsx` compose covers, canonical
  Room context actions and the single set of participant nodes.
- `src/components/layout/MessengerRailView.tsx`, `MessengerSidebarView.tsx`,
  `MessengerSidebarRows.tsx` and `src/components/ui/DockMagnifier.tsx` own
  mode selection, canonical DM rows and compact navigation with stable targets.
- `src/components/layout/AppNavigationVisual.tsx` owns `AppSidebarVisual` and
  the shared session/account root; `VoiceCompactSessionDock.tsx` measures that
  combined root while a call is present.
- `src/components/settings/InterfaceDesignSettings.tsx`,
  `AppPreferencesProvider.tsx`, `src/hooks/useInterfaceDesign.ts` and
  `src/lib/app-preferences.ts` own the free device-local selection.
- `src/hooks/useCoarsePointer.ts` observes `(hover: none), (pointer: coarse)`
  with subscription cleanup; `GroupNowRoomSection.tsx` separates preview from
  explicit touch entry. Desktop native titlebar adaptation lives in
  `desktop/src/styles.css`.
- Room cover UI uses `src/lib/chat/room-cover.ts`; server service/data modules
  and `drizzle/94-room-covers.sql` own validation and persistence.
- `src/components/chat/GroupRoomCreateAction.tsx`, `GroupRoomActionSlotContext.ts`
  and `GroupWorkspaceView.tsx` own the single Room-creation action and its slots;
  `src/components/layout/AccountMenuVisual.tsx` owns canonical dock shortcuts.

- `src/components/chat/GroupWorkspaceHeader.tsx` owns the local workspace header;
  `GroupBanner.tsx`, `GroupBannerSlotContext.ts` and `GroupInfoDrawerView.tsx`
  place only a real custom banner behind the local title and existing banner area.
## Verification

Local verification on 2026-10-29 used current source and CSS in bounded rounds:
ten Room/theme/host cases, four local-header/banner cases and ten rail-state cases
passed. After correcting the dock inset and synchronized expansion transitions,
all six focused DM cases passed at 360, 1024 and 1440px on both hosts, including
multiline input, immediate manual navigation expansion and account-only mode.
These are synthetic presentation checks, not a deployed-runtime acceptance.
The subsequent banner/section-header refinement passed twelve focused cases:
both hosts and themes at 360, 960 and 1440px. They verify the preserved banner
bottom, local hover blur, mobile tab boundaries, live section selection and
long-name bounds. The existing section picker moves through a header slot;
no second section-navigation implementation is introduced.

Architecture, TypeScript, lint (three existing warnings), all native Node tests
and the desktop build passed on 2026-10-29. Default Turbopack compilation still
fails when its PostCSS child exits before connecting, including outside the
Windows sandbox. The standard `npm run build -- --webpack` production build
passed. The final shell checks cover six desktop and four 360px mobile cases
across web/native and both themes, including embedded Room bounds, retained Room
navigation, explicit fullscreen with unchanged stage DOM, personal-message
contact selection and search stacking. Mobile Room rows have a minimum track
height and scroll inside the pane so call controls remain available.

Use `node scripts/verify-core-rework-group-surface.mjs --orbit-focus --offline`
for the in-memory synthetic shared-view flow without network access. This covers
mobile/desktop widths, both themes, design rollback, magnification,
roster disclosure and dock/composer geometry. This fixture proves presentation,
not authenticated media transport or production S3/SQL integration.

Review captures under `.impeccable/review/orbit-*`, `orbit-roster-*` and
`orbit-neighbour-*` use synthetic fixtures. Native tests and production builds
are separate evidence and must be reported from the actual final verification
run. The owner reports migration 94 applied in production on 2026-10-29. No live
S3 upload or authenticated media transport verification is claimed.
The intentional layout-property transitions support real cover/roster resizing;
static detector advisories and screenshots do not prove measured frame pacing.

## Coarse-pointer interaction

A touch/coarse pointer uses a deliberate two-step flow: tapping Room artwork or
its name previews the Room and roster; the explicit entry/switch/open button
inside the expanded cover performs the voice action. Tapping outside closes the
preview, except while interacting with the selected Room or its owned portalled
popup. Avatar stacks and the gear remain alternative details/actions controls.
Desktop pointer and keyboard activation retain direct voice actions. All
subscriptions and the outside-pointer listener clean up when the view changes.
Room position, cover size and title height/font use one coordinated 500ms
transition, removing the previous title-height step during centre-based growth.
Gear visibility responds to CSS hover only for `(hover: hover) and (pointer:
fine)`. On touch, the first tap previews the Room and reveals the gear.
Visible keyboard focus also reveals it. Existing owned-popup focus, Escape handling
and explicit voice-entry semantics remain shared.

At native window widths of 600px or less, the titlebar hides the app word only.
The canonical mark and native window controls remain. Group identity/actions
stay in the common header below the titlebar; no duplicate native Group row
is added.

## Embedded Room and personal-message entry

Joining keeps Compact. Only the explicit Room or dock Open action opens the shared Room stage
within the Group chat pane, retaining the two-column Rooms list. Only the existing
fullscreen control takes the viewport. ResizeObserver follows pane geometry while
the same portal and stage stay mounted; navigation away restores Compact. On
compact layouts the workspace channel row identifies the Room and provides a
back-to-Rooms action that restores the floating Compact tile. Classic join/presentation semantics are unchanged.
The DM column has its plus in the header. It opens contact selection using the
same chat.contacts and chat.openDirect contracts as the ordinary inbox, with
pending/error/retry states. Both contact selection and global search layer above
the DM column and restore focus to their invoking controls.

## Call participant grid

Audio-only calls reuse VoiceParticipantCard in a fitted square grid. Canonical
identity and volume callbacks remain unchanged. Mobile has two columns; a pure
layout helper fits common call sizes by available width/height before allowing
bounded overflow at readable minimums. Tile centres and participant order stay
fixed across hover/focus/speaking. Hover/focus/open actions use 1.08 scale, with
0.97 neighbours; reduced motion disables transforms. Right-click and Shift+F10
anchor separate action surfaces beside the tile; an explicit 44px action also
works on touch. Fullscreen menus portal inside the fullscreen element. Existing
video/screenshare Grid/Focus presentations are retained.

## Contextual channel chrome and unified DMs

An explicitly expanded Group Room replaces the text-channel header with its name.
Group People is hidden until requested. Secondary controls move to the lower
Room area and reveal on hover/focus, with permanent touch access. The existing
Compact dock stays mounted on desktop and carries connection quality; mobile
quality remains in its controls sheet. Room content and media stay mounted.
DMs have one workspace header/frame using Group context dimensions. Persistent
shell data fills list/create/info slots. Wide layouts default to canonical peer
profile information; smaller layouts use a toggle and local panel. Profiles use
the existing privacy-filtered beta query. Search/contact selection portals into
the active fullscreen element or body, including on mobile.

Expanded Orbit calls keep minimize/close and Group chat in the upper-right,
fullscreen in the lower-right with an enter/exit icon, and one consistent set
of media/secondary controls at the bottom centre. Native fullscreen omits the
Room directory. The participant destination uses an icon and Участники tooltip.
The Group conversation drawer keeps its composer above mobile call controls.

Local checks must run serially: one browser harness or production build at a
time, with NODE_OPTIONS=--max-old-space-size=2048 for Node processes. Never run
web, native builds and browser checks concurrently on the owner's machine.

The final control-layout pass covers ten desktop/mobile host/theme cases,
including shared media/action fills, the absence of an inherited dark footer,
Room chat/composer bounds, retained drafts, and native fullscreen without the
legacy Room directory. Menu and tooltip portals follow fullscreen transitions.

Orbit's mobile inbox uses the canonical combined chat list so Groups and DMs
remain available when the desktop rail is hidden. Room roster rows use the
same width. Cameras and screen share retain Orbit's square participant identity
and shared action surfaces. A newly visible local or remote screen starts in
focus; the always-visible grid action or Escape leaves focus without closing
the Room. Explicit grid choice persists for that screen. Profile keeps the
canonical customizable card inside the common workspace header/frame.
