# Premium nickname fonts: second Style consumer

`selectPremiumNicknameFont` is the second reviewed personal Style capability.
Active legacy subscription OR active Style coverage authorizes `serif`,
`rounded`, `mono`, `display` and `soft`. `sans` and null/reset are free. Full
is ignored, including Full-only coverage. The existing app-theme policy and
policy-version identifier are unchanged; the focused type now lives in
`src/types/personal-style-access.ts`.

`profile_customization.nickname_font` stores the saved preference. Expiry,
revocation and reads never reset it. Pure `resolveEffectiveNicknameFont`
projects an allowed premium preference to itself and otherwise to `sans`.
Restoration reactivates the retained preference. Explicit `sans` selection
replaces it. Only the automatic legacy-expiry font reset was removed; other
legacy cleanup remains. Effects, color, standalone gradient policy, frames,
wallpaper, Store ownership/equip, billing and Group charges are unchanged.

The trusted customization service validates the font and computes access on
each premium mutation. Each other field in a mixed patch retains its existing
legacy or ownership gate; failures occur before persistence. Ordinary clients
cannot supply capabilities. `customization.accountNicknameFont()` is a
protected self-only read. Equipment exposes `savedNicknameFont`,
`effectiveNicknameFont` and `selectPremiumNicknameFont`; `nicknameFont` remains
a saved-preference alias for the editor, never a public rendering field.

## Database boundary

Apply `90-style-nickname-font-write-boundary.sql` after 89 and before deploying
the consumer. The required release chain contains 49 migrations. Migration 90
does not rewrite rows or replace migration 89's function. The existing runner
commits the migration and checksum ledger entry atomically.

An independent ALWAYS BEFORE INSERT/UPDATE trigger uses SECURITY INVOKER,
`current_user` and a fixed `pg_catalog` search path. Anon/authenticated premium
inserts and premium font changes fail with `42501`, including UPSERT insert
paths. Default/`sans` inserts, changes to `sans`, same-premium and unrelated
updates remain allowed under the existing RLS. Trusted service writes remain
allowed. JWT role claims cannot bypass the actual SQL-role check. Public SELECT,
table grants, RLS and unrelated customization writes remain compatible.

Readiness checks the exact bodies of both new functions, trigger events and
ALWAYS state, invoker mode, search paths, volatility, result types and effective
function privileges. Migration 89's readiness contract stays unchanged.

## Public projections and batching

Profile and mini-profile share `mapUserToProfile`; feed, hashtags, posts,
status posts, comments and nested reposts share `mapUserToAuthor`. These paths
pass explicit batch Style coverage and a shared evaluation instant into pure
mappers. Historical appearance snapshots render their captured customization,
including nickname font, without evaluating current entitlement or modifying
the snapshot. This also applies to nested reposts. Live author customization
remains independently subject to current access. Web and desktop consume the
same views. The Drizzle adapter preserves raw storage facts before mapping.

`loadNicknameFontAccessRest` deduplicates subject IDs and uses one evaluation
timestamp for all chunks of at most 200 subjects. Migration 90's service-only
`load_active_style_subjects` returns distinct active Style subjects in one JSON
aggregate. A normal grant-row query could truncate when overlapping grants
exceed PostgREST's row limit; the aggregate stays complete and bounded by the
requested subject count. Joined legacy subscriptions supply the other access
source. No mapper or per-author loop performs entitlement reads. Invalid or
failed snapshots throw rather than silently denying access.

Current chat lists/senders, Group members/contact cards, search/highlights and
notifications expose names plus avatar/badge fields, without nickname-font
styling. Their compact-avatar mappers do not return a font. This slice does not
add font rendering to those surfaces. All existing font consumers are covered.

## Shared editor

Premium font options use the focused capability while other style controls
retain their legacy rules. An unavailable saved choice remains selected and
has a retained-choice message; the main preview uses `sans`. Selecting `sans`
stays available. Font changes do not include effect/color/gradient fields.
The self capability read refreshes every 30 seconds and on focus/reconnect;
read errors deny premium preview. Existing pending and rollback behavior is
retained. Both clients mount the same editor.

## Evidence

Native unit tests cover capability boundaries, enum validation, mixed patches,
preservation, restoration, effective projections and bounded batching. Real
PostgreSQL 16/PostgREST 12.2.3 tests cover SQL roles, spoofed claims, premium
INSERT/UPDATE/UPSERT, unrelated retained-premium updates, RPC privileges and
overlap beyond the REST limit. The concurrent Quality Gate runs this suite and
the fresh 49-migration chain with no CI skip or production fallback.

`npx playwright test --config playwright.theme.config.ts` runs the existing
theme tests and focused nickname-font editor tests on web/desktop at 360px
and 1280px in Void and Light. The browser transport is mocked; database security
is proved separately by real REST tests.
