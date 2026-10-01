# Legacy commerce prerequisite compatibility

Migration `83-commerce-prerequisite-compatibility.sql` closes the missing legacy
commerce dependency in the tracked release chain. It creates or validates only
`public.subscription_tier`, `public.subscriptions`, `public.group_boosts` and
`public.group_customization`. The evidence is the commerce attestation captured
2026-10-01 at 11:09:53.405 UTC; its canonical LF SHA-256 is recorded in the
migration header and schema-only fixture. No production connection is required
to apply this evidence to a disposable test database.

## Dependency order

Apply **45 -> 82 -> 83 -> 38 -> 39 -> 43 -> 46..81**, as listed in
`scripts/migration-manifest.mjs`. 45 bootstraps the ledger before core creation;
82 supplies users/chats and the other core prerequisites. 83 precedes 38 because
38 and 43 install RPCs whose deferred bodies query legacy commerce tables.
51's SQL-language capacity function resolves those tables during installation.
Filename chronology does not determine dependency order. Historical ignored
SQL remains provenance and is never replayed wholesale.

## Preserved production contract

| Object | Contract |
| --- | --- |
| subscription_tier | Exactly `plus`, then `pro`, in public |
| subscriptions | UUID user PK; cascading user FK; non-null tier, started/expires timestamps, provider varchar(50), external ID varchar(200); started_at defaults to now() |
| group_boosts | Non-null user UUID; nullable chat UUID; cascading user/chat FKs; non-null created/assigned/moved timestamps and idempotency UUID; created_at defaults to now(); smallint slot constrained to 1..3; no PK; chat index and unique user+slot/user+idempotency indexes |
| group_customization | Chat UUID PK/cascading FK; all 15 attested columns, exact types/nullability/defaults; accent, public slug, role color, tag and vanity slug checks; partial unique public/vanity slug indexes |

Subscriptions retain **timestamp without time zone**. All Boost timestamps and
customization updated_at/boost_grace_until retain **timestamp with time zone**.
Customization boost_grace_level is nullable smallint. The complete column list
is in `tests/fixtures/commerce-prerequisite.json`: description, icon, accent_color,
updated_at, public_slug, avatar_key, boost_grace_until, boost_grace_level,
banner_key, tag, vanity_invite_slug and the three role colors, plus chat_id.

All three tables have RLS enabled without forced RLS. Subscriptions has the
permissive PUBLIC SELECT policy `subscriptions_select_own`, using
`auth.uid() = user_id`. Boost/customization have no policies: ordinary browser
roles cannot read or write rows. The attested anon/authenticated/service_role
table grants are preserved, including TRUNCATE, REFERENCES and TRIGGER; RLS
does not govern TRUNCATE. This compatibility slice preserves that legacy access
contract rather than changing it. PostgreSQL 17's attested MAINTAIN privilege
is created/checked only on 17+, since PostgreSQL 16 has no such privilege.
PUBLIC has no table grants. Supabase platform role and auth-helper ownership
remain prerequisites, already checked by 82.

## Creation, adoption and readiness

Creation occurs only when each object is absent. Existing tables receive no
DDL or data writes. Extra compatible columns, indexes, constraints, triggers
and rows survive. Additional policies fail closed because they change the
attested access contract. Drift in enums, exact column types/typmods,
nullability/defaults, collation, generated/identity state, PK/FK/check definitions,
constraint validation/deferrability and FK enforcement triggers, required indexes/predicates/uniqueness,
RLS, required policies or effective role grants rejects the migration.

The actual runner commits migration SQL and the ledger entry in one transaction.
Failure rolls back new objects and creates no ledger entry. Repeated application
verifies the canonical LF checksum and returns an immutable no-op. Existing
legacy-detected ledger entries still require separate verified adoption.

`scripts/commerce-prerequisite-readiness.mjs` extracts the catalog-only validation
block from 83 and executes it in a READ ONLY transaction. The release readiness
command invokes it alongside core and RPC checks. It reads no application rows
and validates the full evolved contract, with no historical intermediate shape.

Drizzle subscriptions and subscription_tier already match. Community schema
declarations now match attested timestamps, smallints, partial slug indexes and
checks; runtime Boost behavior is unchanged.

## Disposable PostgreSQL proof

The baseline integration test uses an empty generated DB and minimal Supabase
shim, then applies every file in RELEASE_APPLY_ORDER using the actual runner
and unchanged SQL. It verifies readiness contracts, the complete immutable
ledger, checksum no-ops and execution of migration 51's capacity/perk functions.
The commerce integration tests independently reconstruct attested schema
metadata and verify adoption, unchanged rows/catalogs, duplicate rejection,
partial slug uniqueness, RLS access, drift failures and transactional rollback.
Only `VOOPLE_TEST_DATABASE_URL` is accepted, on a loopback test server. CI runs
these tests on PostgreSQL 16. No production credential fallback exists.

The entire current tracked chain installs from empty; no further untracked
baseline table prerequisite was encountered. This does not add optional shop,
inventory, wallet, payment, fulfillment or promo schemas/RPCs. It issues no
personal-plan grants or Group charges and changes no Grade, Boost, pricing,
entitlement or Store behavior. Production remains untouched.

## Local verification

Remote master was verified before changes at
`f4be16d3d02c7688d0b9091b2372a572a8715780` (merged PR #70).
The migration's canonical LF SHA-256 is
`ee817aa2f5c843ce40f44b4eb52799ee237e6e1a1befb6147f8c784cdb9c78b5`.

455 native Node unit tests and all 51 PostgreSQL integration tests passed, with
no skips, on disposable PostgreSQL 16.15. All 42 release migrations installed
from empty. The unchanged readiness CLI also passed using test TLS. Adoption
preserved rows and compatible additions; incompatible collation and disabled
FK enforcement triggers were rejected alongside the other drift cases.

Architecture, lint, `npx tsc --noEmit`, `npm run build` and
`npm --prefix desktop run build` passed. Lint retains three existing warnings;
the desktop build retains its large-chunk warning. This schema-only change has
no viewport-dependent UI flow. No development server was started, and the
dedicated test container was removed after verification.
