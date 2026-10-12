# Profile/card styling: fifth accepted Style slice

Four independent capabilities use active legacy subscription OR active Style
coverage: `selectPremiumProfileFramePreset`, `selectCustomFrameColor`,
`selectPremiumCardBaseMode` and `selectProfilePalette`. Full coverage is ignored.
The existing app-theme and nickname capabilities retain their accepted rules.
This slice does not complete the Style migration.

## Selection and presentation

Null/no frame, `frame-slate` and `frame-glass` are free. `frame-custom`,
`frame-gold-glow` and `frame-aurora` require the frame-preset capability.
Other IDs remain Store cosmetics: ordinary trusted updates require an owned
item with resolved slot `profile_frame_id` and matching resolved equip value.
An owned item in another slot cannot authorize a frame. Subscription-required
Store items still require active legacy subscription; Style does not satisfy
their metadata. Store purchase, gift and other slots retain their existing rules.

Frame color accepts null/reset freely, or exact six-digit HEX with its own
capability, independently of the selected frame. Only presets whose existing
semantics consume custom color use it. Card mode accepts `mirror` and null/reset
freely; `theme` and `plain` require the card-base capability.

The two profile palette channels share one capability. Null/reset and the
canonical defaults (`#0A0A0F` primary, `#7B3AED` accent), compared
case-insensitively, are free. Any other exact six-digit HEX in either patched
channel requires palette access. Every field in a mixed patch is authorized
before the single customization write; failure produces no partial update.

Saved columns remain the user's preferences. Denied premium presets render no
frame; denied custom frame color renders null; denied premium card mode renders
`mirror`; denied palette renders the canonical defaults. Malformed saved colors
and modes fail closed. Null palette channels use their existing defaults.
Non-preset Store frames preserve existing presentation semantics and are not
hidden merely because Style is absent. Restoring access reactivates retained
preferences; explicit free selection/reset replaces them.

Legacy expiry cleanup no longer clears frame color, card mode or palette.
Recognized frame presets are retained even when a Store row shares their value.
Subscription-required non-preset Store frames still follow legacy cleanup.
Uploaded custom banners remain legacy-only, including their existing cleanup,
and are deferred to the next slice. Avatar history, wallpaper, badges, billing,
Full lifecycle and Group charges are unchanged.

## Shared live and historical views

Profile, mini-profile and author projections use the joined legacy fact and
the existing `loadNicknameFontAccessRest` Style subject batch. Feed, comments,
status and repost authors share that projection. The same bounded Style fact
serves all accepted capabilities, with deduplicated chunks of 200 subjects and
one evaluation timestamp. No per-author or per-capability entitlement query is
introduced. Compact surfaces gain no new styling fields.

New appearance snapshots capture effective customization. Existing snapshots,
including nested reposts, render captured facts without current entitlement
evaluation or object mutation. The shared profile-card renderer and image/export
endpoint consume effective profile projection; web and desktop share the views.

Equipment exposes saved aliases, explicit saved/effective fields and the four
capabilities. Inventory matching uses saved facts. ProfileEditSheet keeps saved
selections, explains unavailable retained preferences, locks premium frame/card
choices and uses effective previews. Its existing self-access refresh serves the
new capabilities and fails closed on read errors. Store CustomizationEditor uses
the focused capabilities for existing frame/color/card/palette controls while
Store item metadata continues to use legacy subscription. Failed mutations keep
the committed card preview; the palette draft rolls back to committed colors.

## Database boundary and release

Apply `93-style-profile-card-write-boundary.sql` before deploying this consumer.
The required manifest and release order each contain 52 migrations. Migrations
89–92 are unchanged. Migration 93 adds no row rewrite, backfill, entitlement,
payment or Group writes and leaves table ACLs, RLS and public SELECT unchanged.

An independent ALWAYS BEFORE INSERT/UPDATE trigger uses SECURITY INVOKER,
`search_path=pg_catalog` and actual `current_user`. For anon/authenticated,
changed/inserted frames may only be null, Slate or Glass; frame color may only
be null; card mode may only be null or mirror; each palette channel may only
be null or its canonical default. Unchanged retained values are allowed during
unrelated updates. INSERT guards also protect UPSERT paths. Spoofed JWT role
claims cannot change the SQL role. Service-role writes remain trusted; the
server independently authorizes entitlements and Store ownership before writing.
The trigger performs no Style query.

Read-only readiness checks the exact function body, signature, invoker mode,
language, volatility, search path and privileges, plus trigger function,
ALWAYS state, INSERT/UPDATE events and absence of arguments/conditions.
The migration runner keeps SQL and checksum ledger insertion atomic.

Native unit tests cover entitlement boundaries, retained facts, Store slot
collisions, projection, snapshots and batching. The real PostgreSQL/PostgREST
suite covers browser INSERT/UPDATE/UPSERT, spoofing, trusted writes, adoption,
no-op checksums, rollback and readiness drift. CI runs PostgreSQL 16 and the full
fresh migration chain concurrently with existing integration suites, with no
security-test skips. The shared Playwright harness covers web/desktop at
360/1280px in Void/Light; mocked UI transport is separate from real DB proof.
