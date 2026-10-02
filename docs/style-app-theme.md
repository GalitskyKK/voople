# Paid app themes: first Style consumer

`getPersonalStyleAccess(userId, evaluatedAt)` is server-only and returns
`evaluatedAt`, `policyVersion: app-theme-legacy-or-style-v1`, the two source
booleans `activeLegacySubscription` / `activeStyleCoverage`, and the
capability `selectPaidAppTheme`. Selection requires legacy OR Style. Full
coverage is never consulted. Legacy semantics remain `expires_at > evaluatedAt`,
without checking `started_at` or tier; Style uses its existing half-open,
non-revoked snapshot. Both reads use one instant but are independent database
reads, not one atomic snapshot. Read failures throw rather than returning denial.

Void, Light and explicit null clear remain free. Unknown IDs are rejected.
Each other field in a mixed patch keeps its legacy subscription/ownership rule;
The second reviewed consumer separately unlocks premium nickname fonts (see
[`style-nickname-font.md`](./style-nickname-font.md)); Style also unlocks premium effects through its third capability (see
[`style-nickname-effect.md`](./style-nickname-effect.md)); it cannot unlock frames, banners or profile palette colors.
Store requires_subscription metadata, purchase/claim/gifting and ownership
rules are unchanged. Wallpaper/Aurora, avatar history and badge identity remain
on their existing legacy rules.

`profile_customization.app_theme_id` is a saved preference. Entitlement loss
never rewrites it. `customization.accountTheme()` is an authenticated self-only
read returning `savedAppThemeId`, `effectiveAppThemeId` and the access projection.
Equipment and Store overview expose both theme IDs too; `appThemeId` is retained
as a documented saved-preference alias for inventory matching, not rendering.
Null or an unknown historical ID renders Void; free themes render themselves;
paid themes render themselves when authorized and Void otherwise. Restoration
reactivates the retained paid preference. Explicit free selection or clear
replaces that preference. Both automatic legacy-expiry theme reset paths were
removed; unrelated legacy customization cleanup remains.

## Database boundary and release order

The audit found table-wide INSERT/UPDATE grants to anon and authenticated,
with own-row RLS but no column guard. Current web/desktop customization writes
use server endpoints; server/admin REST writes use the service-role client.
The existing users bootstrap inserts an empty customization row. No current
browser writer was found, but unrelated direct writes remain compatible.
The tracked SQL contains no browser-callable theme-writing RPC.

Apply `89-style-app-theme-write-boundary.sql` before deploying this consumer.
It follows migration 81 and the
customization foundation in 84. Historical migration 84 is unchanged.
The current 50-migration chain ends with independent migration 91, which leaves
this guard unchanged. The migration runner applies SQL and checksum ledger inserts atomically.
It performs no row UPDATE, DELETE or preference backfill.

An ALWAYS, BEFORE ROW INSERT/UPDATE trigger calls a SECURITY INVOKER function
with a fixed pg_catalog search path. It checks the actual SQL current_user,
not editable JWT claims: anon/authenticated cannot insert a non-null theme or
change an existing theme, including clearing it. Default/null inserts and
same-value updates remain possible; unrelated fields, grants, RLS policies and
public SELECT are unchanged. Service-role writes and database-owner maintenance
remain possible. Only trusted server code authorizes selection; the DB guard
prevents ordinary direct REST bypass, not misuse of server credentials.

Readiness verifies trigger events, ALWAYS enablement, invoker/search-path
properties and the exact function body. Tests prove compatible adoption,
unchanged rows/ACLs, checksum no-op, transactional rollback, readiness drift
rejection and the entire fresh PostgreSQL 16 chain.

## Client rendering

Web mounts the shared sync inside authenticated layouts; desktop mounts it
under its authenticated tRPC provider and resets that provider on account change.
Paid localStorage values cannot authorize the provider, including before its
first account read. Sync accepts only a fresh account projection after mount,
refreshes every 30 seconds and on focus/reconnect, and renders Void on errors.
This is client-controlled rendering, not SSR entitlement enforcement; expiry
or revocation becomes visible on the next successful refresh. The server
recomputes authorization on every mutation regardless of cached UI access.

Selection waits for a successful mutation before applying its effective theme;
there is no pending paid localStorage write or optimistic paid flash to roll
back. Failure retains the previous rendering. Sync fallback never writes the
saved preference or localStorage. Both Settings adapters use the capability
for theme controls and a separate legacy boolean for wallpaper.

## Verification commands

Use the repository's native `npm run test:unit`. Run the focused server tests
with `node --experimental-strip-types --test tests/style-app-theme.test.mjs`.
The Quality Gate adds `tests/integration/style-app-theme.integration.mjs` to
its exact concurrent integration command. Disposable PostgreSQL 16 and
PostgREST 12.2.3 must be on loopback; set VOOPLE_TEST_DATABASE_URL and
VOOPLE_TEST_POSTGREST_URL. PostgREST exposes both style_fulfillment_test and
app_theme_test and uses the committed disposable-only JWT fixture secret.
Missing database services fail in CI rather than skipping security tests.

`npx playwright test --config playwright.theme.config.ts` exercises the shared
provider, sync, selector and Settings at 360px and 1280px against a mocked tRPC
transport. It covers stale storage, reload preservation, restoration, failed
mutation, free replacement, read-error fallback and wallpaper isolation.
This browser fixture proves client behavior; real DB/REST tests prove security.
No production credentials or production fallback are used.
