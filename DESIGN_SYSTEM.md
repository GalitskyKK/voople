# Voople design system

This document is the visual contract for the web application, the Tauri client
and public product pages. It complements [ARCHITECTURE.md](./ARCHITECTURE.md):
architecture defines ownership, while this document defines how shared UI must
look and behave.

## Product direction

Voople has one identity with two presentation modes:

- **Authenticated beta uses cold material.** Void, Chrome, Matte Stage,
  Frosted Object and Signal Frost define hierarchy. Ice is a small light
  signal; wine is a faint ambient reflection. Neither is a panel fill.
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

`primitive palette -> Chrome / Stage / Frost / Signal tokens -> component primitives -> route composition`

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
| Primitive | `--background`, `--foreground`, `--app-*`, brand and state colours | Theme inputs. |
| Chrome | `--material-chrome`, `--material-canvas-sidebar` | One mostly opaque, unblurred shell shared by sidebar and contextual headers. Separation is spatial, not a border between them. |
| Matte Stage | `--material-stage`, `--material-stage-depth`, `--material-ambient-wash`, `.voople-stage` | Inset working plane for content, with low wine/ice illumination and no backdrop blur. Stage has no repeated texture tile; visible grid artefacts are unacceptable. |
| Frosted Object | `--material-panel-fill`, `--material-raised-fill`, `--material-control-fill`, `--material-overlay-fill`, `--material-inset-fill`, `--material-interactive-fill`, `--material-glass-body`, `.voople-glass-object`, `.voople-overlay-surface` | Independent Rooms, composers, mini voice and overlays above Stage. Use one blur at the object boundary; rows and controls use fills without blur. |
| Signal Frost | `--material-glass-active-body`, `.voople-signal-glass` | Current/live objects keep a neutral body and gain an ice edge and restrained bloom. |
| Optical glass | `--material-glass-edge`, `--material-glass-active-edge`, `--material-glass-scrim` | One-pixel optical rim, restrained active edge and a low-contrast content scrim. No colour field inside Room cards. |
| Shared properties | `--material-ice`, `--material-ice-soft`, `--material-wine`, `--material-presence`, `--material-border`, `--material-border-hover`, `--material-highlight`, `--material-specular`, `--material-accent-glow`, `--material-shadow`, `--material-shadow-hover`, `--material-overlay-shadow`, `--material-blur`, `--material-saturation`, `--material-radius`, `--material-control-radius`, `--material-focus-ring`, `--material-secondary-text`, `--material-skeleton-*` | Consistent light, edge, shape, focus, presence and loading. Blur is optional. |
| Component | `Card` panel/raised/inset/row, secondary `Button`, `Skeleton` avatar/text/room/row; `.voople-material-control`, `.voople-material-row` | Small reusable presentation vocabulary. |
| Route override | `messenger-glass.css` | Layout and restrained accents; shared surfaces resolve through material tokens. |

Void Glass fills are translucent over Matte Stage; Light uses separate
frosted-white values. Chrome and Stage remain opaque and unblurred. Room glass
uses a translucent neutral body with a single backdrop blur. A masked,
one-pixel optical rim is brighter on the upper/left edge and fades toward the
lower/right edge; a faint bottom scrim protects content legibility. The active
Room keeps nearly the same body and gains a brighter ice rim and soft bloom;
the create tile has a faint fill and dashed edge without blur. Refraction
through rich media is deferred and is not simulated with gradients in Room
cards. Real backdrop blur is reserved for large surfaces;
rows, chips and counters use fills without nested filters. Use
`--material-focus-ring` for keyboard focus and shape-matched skeletons for
pending content. At narrow widths blur is disabled while the optical edge and
material hierarchy remain. Reduced motion stops animated specular; reduced
transparency removes blur and substitutes opaque
fills in both themes.

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
  support, visible focus and at least a 40px practical target on touch layouts.
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
