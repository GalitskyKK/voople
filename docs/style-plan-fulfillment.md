# Trusted Style plan lifecycle

`fulfillStylePlanGrant` and `revokeStylePlanGrant` in
`src/server/services/style-plan.service.ts` manage provider-neutral entitlement
facts in the existing `personal_plan_grants` table. Both are server-only.
The writer always issues Style. It cannot issue Full or a Group charge.

## Fulfillment

Trusted callers supply `{ userId, sourceReference, validFrom, validUntil }`.
`userId` must be a UUID. The source reference must be non-empty, already trimmed
and at most 200 characters; the service never repairs it. The validity endpoints
must be finite ISO timestamps with explicit timezone offsets and at most six
fractional digits, and the end must be later than the start. Extra fields,
including a caller-supplied plan kind, are rejected.

`source_reference` is the immutable identity of the fulfillment operation.
Callers must retain it across retries. A first call inserts one Style row and
returns its validated persisted facts, including its ID and creation timestamp.
An exact replay returns the existing row, with its original `created_at` and
`revoked_at`. Replaying a revoked grant never reactivates it.

Reusing a source reference with a different user, kind, start or end raises
`SOURCE_CONFLICT`. Existing Full rows also conflict. The existing row is never
updated by fulfillment. UUID case is normalized; timestamps compare as integer
microseconds since the Unix epoch. Equivalent offsets represent the same instant.
PostgreSQL timestamps are authoritative, and no milliseconds truncation or
rounding is applied. More than six fractional digits are rejected rather than
silently rounded to database precision.

The data adapter attempts INSERT first. Only PostgreSQL error `23505` naming
`personal_plan_grants_source_reference_key` permits a read of the existing source
and immutable-fact comparison. Other database failures remain failures. Database
uniqueness settles competing inserts: identical concurrent calls converge on one
row; conflicting calls accept one fact and reject the other.

## Revocation

`revokeStylePlanGrant({ sourceReference })` conditionally updates a Style row
whose `revoked_at` is null. PostgreSQL interprets the timestamp input `now` using
the update transaction's time. The update changes only `revoked_at`.
Concurrent revocations use the same conditional write; losers read the existing
row and return its original revocation timestamp. Repeated revocation succeeds
without changing that timestamp. A missing source raises `NOT_FOUND`, and a Full
source raises `SOURCE_CONFLICT`. Rows are never deleted or reactivated.

## Authorization and coverage

`admin.grantStylePlan` and `admin.revokeStylePlan` use the existing
`adminProcedure`: verified authentication followed by the
`VOOPLE_ADMIN_USER_IDS` allowlist. Grant input includes all four explicit facts;
the server does not generate an operation identity. There is no Store control
or ordinary-user writer. Table privileges remain service-role-only.

The service distinguishes `INVALID_REQUEST`, `SOURCE_CONFLICT`,
`INTEGRITY_FAILURE`, `NOT_FOUND` and `DATABASE_FAILURE`. The admin transport maps
these to BAD_REQUEST, CONFLICT, BAD_REQUEST, NOT_FOUND and INTERNAL_SERVER_ERROR
respectively, with safe messages. Raw database details stay out of browser errors.

`shop.personalPlanStatus()` remains an authenticated self-only read. Coverage is
active when `valid_from <= evaluatedAt < valid_until` and `revoked_at` is null.
Fulfillment is immediately visible through the existing snapshot query;
revocation removes coverage from that grant. Independent overlapping facts retain
the existing `simultaneousCoverage` policy. There is no selected plan or precedence.

Legacy subscriptions remain independent: there is no mapping, backfill or dual
write. This slice adds no Full issuance, Group charge issuance, Store/YooKassa
integration or billing lifecycle. The first consumer, paid app themes, is
documented in [`style-app-theme.md`](./style-app-theme.md); it does not change
this lifecycle or its write boundary. The second accepted consumer, premium
nickname fonts, is documented in [`style-nickname-font.md`](./style-nickname-font.md). Overlap, upgrades,
downgrades and proration still need accepted product contracts.

## Verification

Run `npm run test:unit` and `npm run test:db:personal-plan`. Database tests require
`VOOPLE_TEST_DATABASE_URL` and `VOOPLE_TEST_POSTGREST_URL` pointing to disposable
loopback services; missing configuration fails in CI. Production credentials
are never loaded. The lifecycle suite uses the actual Supabase REST client,
PostgREST 12.2.3 and PostgreSQL 16, with an isolated schema and a dedicated
service-only test role. Its URL adapter only removes Supabase's `/rest/v1` mount
prefix and the placeholder Authorization header; database operations are real.
SQL privilege checks separately prove browser roles cannot insert, update or delete.

The Quality Gate runs the lifecycle suite concurrently with the other PostgreSQL
contracts. The lifecycle itself requires no migration. The subsequent paid-app-theme
consumer adds security migration 89; the current required migration count is 50 after independent effect/gradient boundary 91.
The third consumer is documented in [`style-nickname-effect.md`](./style-nickname-effect.md).
