# Voople design system

This document is the visual contract for the web application, the Tauri client
and public product pages. It complements [ARCHITECTURE.md](./ARCHITECTURE.md):
architecture defines ownership, while this document defines how shared UI must
look and behave.

## Product direction

Voople has one identity with two presentation modes:

- **Authenticated beta uses quiet matte surfaces.** Void, Chrome, Matte Stage,
  Quiet Row, Current Signal, Overlay and Identity define hierarchy. Ice is
  reserved for live/current/focus/connected signals. Identity supplies colour.
- **Public pages are editorial.** The landing page may use larger type, more
  whitespace, hairline dividers and scroll-led storytelling, while retaining
  the same typeface and interaction language. Its purple brand assets do not
  define authenticated controls.
- **State uses form and intensity.** Presence is a quiet cold point; live voice
  adds a radio/waveform pictogram and ice signal. Danger keeps muted red for
  safety. Primary actions rely on density, contrast and edge, not a purple or
  saturated blue fill.
- **Familiar patterns, Voople language.** Proven interaction patterns may be
  reused, but layouts, terminology and visual assets must not imitate another
  product literally.

The canonical brand mark is the artwork in
`public/favicon/android-chrome-192x192.png`, rendered through
`src/components/brand/VoopleMark.tsx`. Keep its corners gently rounded; do not
replace it with page-specific initials, mascots or generated symbols.

## Token architecture

Components consume semantic tokens, never reference-specific colours. The
dependency direction is:

`primitive palette -> Chrome / Stage / Row / Signal tokens -> component primitives -> route composition`

The canonical tokens live in `src/app/globals.css`; Tauri imports the same
global stylesheet and only supplies native window fonts and chrome.

### Material hierarchy (beta)

Void and Light each have complete material values in `globals.css`. App theme
selection supplies the base `--background` / `--foreground` palette; Light
supplies genuinely light fills, borders, shadows, focus and loading colours.
Messenger owns composition but must not redefine a second canvas palette or
force `color-scheme: dark`. Profile
Card customization is an independent identity surface, not a generic panel.

| Layer | Tokens / primitives | Purpose |
| --- | --- | --- |
| Void | `--material-canvas-app` | Outer canvas. |
| Chrome | `--material-chrome`, `--material-canvas-sidebar` | Mostly opaque cold graphite/navy sidebar and contextual header. No blur or glow. |
| Matte Stage | `--material-stage`, `.voople-stage` | Working surface slightly lighter than Chrome. Quiet tonal variation only; no nebula, aurora or gradient artwork. |
| Quiet Row / Room Section | `--material-row-hover`, `.voople-group-now-room` | Nearly flat Rooms, People, Search, Notifications and Settings. Small luminance change on hover/focus. No glass cards. |
| Divider | `--material-divider` | Quieter than control borders; separates columns and Room sections without creating cards. |
| Current Signal | `--material-current-fill`, `--material-ice` | Quiet raised matte surface, thin Ice marker and explicit current label. No cyan body, bright outline or bloom. |
| Overlay / Floating | `--material-overlay-fill`, `.voople-overlay-surface` | Elevated opaque menus, popovers, dialogs, sheets, composers and Mini Room. Restrained Frost is optional; never nest glass. |
| Identity | Canonical avatar, Profile Card, Group artwork and cosmetics | Primary expressive and colourful layer. Preserve paid themes and custom identity. |

Ice signals live/current/focus/connected state only. Wine is not semantic;
any material temperature must be imperceptible as a pink gradient. Purple
belongs to logo/public/identity/customization/legacy previews, not system
controls. Authenticated system states use material tokens independently of
purple or emerald custom theme accents. Existing glass tokens remain available
for deferred surfaces; glass is not a required brand primitive.

### Authenticated Group Voice

Group Voice is one vertical flow of Room sections. Lobby is first, followed by
pinned Rooms in server order. Temporary Rooms follow in their own section in
server order; empty temporary Rooms are hidden. Pending Split/Voop never adds
a placeholder Room. A compact **+ Комната** action creates a persistent pinned
Room through the existing dialog.

Each Room is a semantic section with a separate 44–48px header button and an
inline participant grid. Header click joins/switches directly; the current
header opens Full Room. Pending join stays local to that header; authoritative
success determines the current marker. Show **Вы здесь**, count and room-level
screen sharing. Split is a small current-session action. Leave belongs in the
persistent session dock.

Render every participant without slicing, +N, collapse controls or horizontal
scrolling. The full-width compact/mobile Voice surface uses roughly 168–190px
minimum columns; the desktop Live column uses one dense participant row per
line. Items are quiet 40–44px rows with 28–32px avatars and names. Secondary
username/guest labels may hide in the narrow Live column. A 20- or 50-person
Room grows vertically within its own scrolling region.

Participant actions are independent of Room entry. Current-session click/tap,
right-click, ContextMenu and Shift+F10 expose the shared person menu with
0–200% volume, local mute, reset and eligible registered non-self Voop. Foreign
Rooms expose identity/presence only, never per-person media state or volume.
Current media details come exclusively from the existing ChatRoomControl and
must match the active core LiveSession ID. No extra media subscription/store.

Desktop Compact lives above the account footer in the shared 220px sidebar;
identity opens Full Room and compact controls operate mic, output, camera,
share and leave. Mobile Compact lives above bottom navigation, respects safe
areas and reserves content space; mic/output/leave remain visible with 44px
targets. Mini remains floating after explicit minimization of Full Room. Full,
Mini and Compact share one lifecycle and preserve media track parking.

Canonical Chat has no Room-card shelf or roster. The Group header spans the
workspace and contains Group identity, membership/online/voice counts, Invite
and Settings, without a participant avatar stack. A wide desktop Group has one
matte Stage with Live / Chat / People columns and quiet dividers. At medium
desktop width, Live and Chat remain side by side while People opens in an
on-demand right panel. Below the desktop composition threshold, **Войс / Чат /
Люди** tabs show one surface at a time. Direct Chat has no Live or People
columns. Live, Chat timeline and People scroll independently; Chat remains the
dominant column and its composer stays pinned. People keeps its existing
Room / available / offline grouping. Custom Profile Cards stay expressive.
The shared desktop Stage has a restrained 16px radius; columns have no separate
card boundaries. Current Room gains only a small luminance lift, 2px Ice marker
and optional inner highlight, with no outer glow.

Loading uses Room-list skeletons. Error/offline states preserve the call.
Keyboard focus is visible; Escape closes menus and restores focus. Both Void
and Light work without blur, with reduced motion and at 360px without horizontal
overflow. Mobile targets are at least 44px. The legacy filename
`messenger-glass.css` remains the shared composition stylesheet.

### Legacy/public brand palette

The `--voople-brand-*` purple family is retained for public/marketing assets,
logo artwork and user-selected identity content. It is **not** the canonical
authenticated application palette, focus colour, selected state or default
primary action. Void and Light app themes use cold ice accents; a custom
Profile Card may display the user's own colours without recolouring the shell.

| Token | Value | Use |
| --- | --- | --- |
| `--voople-brand-50` | `#f5f3ff` | light tint |
| `--voople-brand-100` | `#ebe7ff` | selected light surface |
| `--voople-brand-300` | `#b8adf3` | decorative highlight |
| `--voople-brand-500` | `#7c6ddb` | primary brand |
| `--voople-brand-600` | `#6656c5` | primary hover/pressed |
| `--voople-brand-800` | `#3c315b` | deep branded surface |

Authenticated components use semantic material aliases. `--theme-accent` is a
compatibility alias and resolves to ice in the default Void and Light themes;
do not use `--voople-brand-*` in generic authenticated controls. `groupAccentColor`
belongs to Group identity (avatar, tag, explicit preview), not tabs, Room body,
focus, Settings, composer or primary controls.

### Surfaces and content

- `--background`: application canvas.
- `--app-surface`: primary panel.
- `--app-surface-soft`: inset or hover surface.
- `--app-border` / `--app-border-strong`: hierarchy without extra shadows.
- `--foreground`: primary content.
- `--app-muted`: supporting content; never use it for required form labels.
- `--voople-content`: standard content width.
- `--voople-content-wide`: editorial/public content width.

Dark and light themes redefine semantic surface tokens. A component must work
without checking the theme name or hardcoding a light/dark page colour.

## Typography

Geist is the canonical type family in both clients. The root `geist` dependency
is the only font source: Next.js loads `geist/font/sans` and `geist/font/mono`,
while Tauri bundles the matching variable WOFF2 files from that package. Do not
reference Next.js devtools fonts, fetch fonts at runtime or introduce a second
UI font. This keeps Cyrillic glyph coverage and font metrics identical in web
and desktop builds without a network request from the client.

| Role | Guidance |
| --- | --- |
| Display | `clamp(3rem, 7vw, 6.5rem)`, 0.9-0.98 line-height, tight tracking |
| Page title | `clamp(1.75rem, 4vw, 3rem)`, 1.0-1.1 line-height |
| Section title | 1.25-2rem, weight 650-700 |
| Body | 0.9375-1.125rem, 1.5-1.7 line-height |
| Label | 0.6875-0.8125rem, weight 600-700; uppercase only for short eyebrows |

Use sentence case in controls. Avoid ultra-light text, fake bold and long
all-caps text. Headlines should wrap by meaning, not by arbitrary `<br>` tags.

## Shape, spacing and elevation

- Spacing follows a 4px base scale. Prefer 8, 12, 16, 24, 32, 48 and 64px.
- Product radii: 10px small controls, 14px inputs, 16px panels, 20px large
  panels. Marketing cards may use 24px. Pills use `--voople-radius-pill`.
- Use borders and surface contrast before shadows. Product panels normally use
  `--app-shadow-sm`; overlays may use `--app-shadow-md`.
- Keep one visual edge per hierarchy level. Do not put a square feature canvas
  inside an unrelated rounded shell with visible empty gutters.

## Motion

- Fast feedback: `--voople-motion-fast` (140ms).
- Standard transitions: `--voople-motion-base` (180ms).
- Editorial scene changes: `--voople-motion-slow` (360ms).
- Animate opacity and transform where possible. Layout-affecting animation must
  have a functional reason and remain usable while interrupted.
- Respect `prefers-reduced-motion`; content and state changes must remain clear
  without animation.

## Shared UI contract

- Authenticated pages use the canonical app shell; compact contextual headers
  share Chrome with navigation. Ordinary page headings sit directly on Stage,
  without an enclosing header card or generic decorative glow.
- Web and Tauri render domain views from `src/components`; native folders only
  adapt navigation, authentication transport, updater and window controls.
- Profile visuals use the canonical avatar/card/customization components.
- Shared customization UI resolves public media through
  `customizationAssetPath()` or `publicAssetUrl()`. Never construct a literal
  `/customization/...` URL in a component: web reads the CDN base from the
  build environment, while Tauri supplies it through the runtime desktop
  configuration.
- Async controls expose pending, error and retry states. Destructive controls
  require confirmation.
- Empty states explain the next action instead of merely stating that content
  is absent.

Before adding a new visual implementation, search for an existing component:

```powershell
rg "PageHeader|Avatar|ProfileCard|SettingsSection|EmptyState" src desktop/src
```

If two domains need the same pattern, promote it to `components/ui` or
`components/layout` before the second implementation lands.

## Responsive and accessibility baseline

Every change must be checked at 360px, a compact desktop window and a wide
desktop viewport.

- No horizontal document scroll.
- The app shell owns height; feature panels scroll internally.
- Persistent docks and composers respect safe areas.
- Interactive elements use semantic controls, accessible names, keyboard
  support, visible focus and at least a 44px practical target on touch layouts.
- Text and essential icons meet WCAG AA contrast.
- Hover-only information has a focus/touch alternative.

## Landing-page rules

The landing page uses the scoped `.voople-landing` semantic tokens. It may be
more expressive than the app, but it must retain:

- Geist typography and the Voople purple family;
- one dominant message per viewport;
- a visible product proof near every major claim;
- conversion actions with stable labels;
- restrained motion and no ornamental animation that delays reading.

## Review checklist

1. Does the component use semantic tokens and canonical shared primitives?
2. Does it work in light/dark themes and at 360px?
3. Is the hierarchy clear without relying on shadow or colour alone?
4. Do web and Tauri render the same domain view?
5. Are loading, empty, error, offline and focus states covered?
6. Has reduced motion and keyboard navigation been checked?
