# Premium nickname effects: third Style consumer

`selectPremiumNicknameEffect` authorizes `gradient`, `neon`, `highlight`,
`outline` and any standalone `nicknameGradient=true` mutation. Active legacy
subscription OR active Style coverage grants access; Full is ignored. `plain`,
null effect reset, gradient=false and gradient=null remain free. The focused
resolver retains its existing policy version and theme/font decisions. Mixed
patches keep every independent legacy subscription and ownership gate.

Saved `nickname_effect` and `nickname_gradient` are presentation facts. Reads,
expiry and revocation never erase them. `resolveEffectiveNicknameEffect` is pure:
denied access produces plain/false; authorized access uses a validated explicit
effect, with a missing legacy effect falling back to its gradient flag. Invalid
effects fail closed. Explicit effects take precedence over inconsistent flags,
and effective gradient is true only for gradient effect. Storage is unchanged.
Restoration reactivates the retained choice. Explicit plain/reset replaces it.
Every explicit effect mutation writes gradient=true for gradient and false for
all other effects, even when a conflicting gradient flag was supplied.

Only automatic effect/gradient cleanup is removed. Other legacy cleanup remains,
including nickname color. Store `nickname_style`, subscription metadata,
purchase/equip/gift and ownership rules remain unchanged: its trusted equip path
keeps the prior Store authorization before writing its gradient flag. Ordinary
customization updates always use the effect capability. Custom color, frames,
profile colors, banners, card base, wallpaper and avatar history remain legacy-only.
Payments, Full issuance and Group charges are unchanged.

## Database boundary

Apply `91-style-nickname-effect-write-boundary.sql` before deploying the consumer.
The release manifest contains 50 migrations. Migrations 89/90 are unchanged.
Migration 91 adds one independent ALWAYS BEFORE INSERT/UPDATE trigger using a
SECURITY INVOKER function, fixed pg_catalog search path and actual `current_user`.
Anon/authenticated premium-effect inserts/changes and gradient=true inserts/changes
raise 42501, including UPSERT insert paths. Same-value retained premium updates,
unrelated updates, plain/reset and gradient=false/null remain permitted by the
existing schema/RLS. The current effect column is NOT NULL; SQL reset uses plain.
Service-role writes remain trusted. Editable JWT claims cannot bypass the guard.
No rows, grants, subscriptions, table ACLs or RLS policies are rewritten.

The migration runner commits SQL and checksum ledger insertion atomically.
`assertNicknameEffectReadiness` validates exact function body, signature, language,
invoker mode, volatility, search path, privileges and trigger events/ALWAYS state.
Tests cover fresh/adopted installation, row/ACL preservation, checksum no-op,
rollback with no ledger entry, readiness drift and the fresh 50-migration chain.

## Live presentation and editor

Profile/mini-profile and author mappers project effects using the same joined
legacy subscription and batched Style fact as fonts. Feed, posts, hashtags,
comments, status posts and nested repost authors share these mappers. The existing
`loadNicknameFontAccessRest` batch now serves both capabilities; it deduplicates
subjects and calls the existing service-only `load_active_style_subjects` aggregate
once per 200 subjects at one instant. No per-author or per-capability query is added.
Overlapping grants beyond PostgREST's row limit cannot truncate subjects.
Historical appearance snapshots, including nested reposts, preserve captured facts.
Compact surfaces that do not already expose nickname styling stay unchanged.

Equipment exposes saved and effective effect/gradient plus the explicit capability.
The existing `accountNicknameFont` self read also returns effect facts/access so
the shared editor refreshes both capabilities with one resolver evaluation every
30 seconds and on focus/reconnect. Read errors deny premium preview. Saved premium
choices stay selected and show a retained-choice message while locked; plain remains
selectable. Style-only access enables premium options. Preview uses effective facts,
including pending drafts and rollback. The legacy customization preview uses the
same effective equipment facts. Web and desktop share these components.

## Verification

Run native `npm run test:unit`, focused effect/font/theme tests and the exact
concurrent integration command in `.github/workflows/quality-gate.yml`.
Disposable loopback PostgreSQL 16/PostgREST 12.2.3 must expose
`nickname_effect_test` alongside existing test schemas. Missing services fail in
CI; no production fallback is permitted. Real REST tests prove both column guards,
SQL-role spoof protection, mixed gates, preservation/restoration and complete batching.

`npx playwright test --config playwright.theme.config.ts` covers theme, font and
effect editor flows on web/desktop at 360px and 1280px in Void and Light. Its mocked
transport checks retained selections, current preview, restoration, failed mutation,
read errors and explicit plain replacement; database security is tested separately.
