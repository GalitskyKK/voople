# Legacy commerce base compatibility

Migration `84-commerce-base-compatibility.sql` makes the deployed catalog,
inventory and profile customization schema reproducible. The schema-only
commerce attestation captured on 2026-10-01 and the supplemental read-only
replica identity attestation are its evidence. Neither file contains release
instructions. Their canonical LF hashes are recorded in the migration and
`tests/fixtures/commerce-base.json`.

The release runner applies `45 -> 82 -> 83 -> 84 -> 38/39/43 -> 46..81`.
Migration 45 creates the ledger; 82 supplies the core baseline; 83 supplies
subscriptions, Boosts and group customization. Migration 84 adds the current
commerce base before the older feature migrations. Numeric filename order
cannot express these dependencies. All 43 tracked migrations remain required.

## Deployed contract

The public enums retain these labels in this exact order:

| Type | Labels |
| --- | --- |
| item_type | effect, ring, banner, nameplate, badge, reaction_pack, decoration, feed_card, app_theme, profile_background, frame |
| acquired_via | purchase, earned, gifted, seasonal_reward, free_claim |
| avatar_type | constructor, photo |
| banner_type | color, pattern, animated |

`frame` and `free_claim` are canonical deployed values. Removing or reordering
them would reject valid existing ownership data. Historical SQL and stale
Drizzle declarations are provenance; they are not replayed. The migration has
no catalog seeds, user data, duplicate cleanup or backfills.

The contract tracks only `shop_items`, `user_inventory` and
`profile_customization`. Their exact columns, types, typmods, defaults,
nullability, constraints, indexes, policies and grants are recorded in the
schema-only fixture. Inventory ownership has an unconditional unique
`(user_id,item_id)` index; inventory timestamps and customization `updated_at`
are timestamp WITHOUT time zone. There are no attested CHECK constraints or
partial indexes on these three tables, so the migration adds none. The
supplemental evidence establishes ordinary tables with REPLICA IDENTITY DEFAULT
(`d`) and no replica identity index on all three.

RLS is enabled, without forced RLS. PUBLIC policies allow catalog/profile reads,
own inventory reads, and own profile INSERT/UPDATE/DELETE. There is no browser
catalog or inventory mutation policy. The broad attested relation grants to
anon/authenticated/service_role are preserved: SELECT, INSERT, UPDATE, DELETE,
TRUNCATE, REFERENCES and TRIGGER. RLS does not protect TRUNCATE. PostgreSQL 17's
MAINTAIN grant is created and checked only on 17+, since PostgreSQL 16 lacks it.
PUBLIC has no relation grants. Platform roles/auth.uid remain prerequisites
owned by the platform and validated by the earlier foundation.

## Creation and adoption

Absent objects are created with the current attested shape. Existing objects
are validated without table DDL or row writes. Validation checks public enum
identity and ordered labels, relkind, replica identity, required column types,
collations, nullability, defaults, generated/identity state, PK/FK definitions,
FK actions and enforcement, constraint validation/deferrability, index
uniqueness/expressions/predicates and valid/ready/live state, RLS, required
policies and effective grants. Owners are not compared.

Compatible extra columns, indexes and triggers survive. Extra policies are
accepted only when equivalent to an attested policy or neutral restrictive
policies; other policy definitions fail closed because they can change access.
The runner applies creation, validation and ledger recording in one transaction.
Failure rolls back all new objects and records no migration entry. Reapplication
checks the canonical LF checksum and leaves ledger metadata unchanged.

`commerce-base-readiness.mjs` extracts only the migration's catalog validation
block and executes it inside READ ONLY. The release readiness command includes
this check alongside 82, 83 and RPC hardening. It reads no application rows and
makes no repairs.

Drizzle now includes frame/free_claim, the four previously undeclared profile
columns (avatar_decoration_id, feed_card_style_id, animated_avatar_id,
app_theme_id), and attested shop lengths/indexes. Shop description is varchar(300);
asset_folder/asset_id/equip_slot/equip_value are varchar(50/100/40/100).
price_rub has no default. The profile declaration is extracted to its own module
with existing exports preserved, keeping the oversized schema module smaller.
Store services and UI behavior are unchanged.

## Verification and remaining work

The independent production-like integration fixture tests adoption, unchanged
rows and compatible additions, effective browser/server access, enum and schema
drift, rollback and checksum no-ops. The full release integration uses an empty
PostgreSQL 16 database, a minimal Supabase shim, real SQL and the actual runner.
The Quality Gate runs all integration files concurrently using the shared
cluster-role helper. Only the loopback VOOPLE_TEST_DATABASE_URL is accepted.

Wallets, wallet transactions, payment intents, subscription fulfillments, promo
codes/redemptions and their legacy RPCs remain unreproducible from this slice.
Migration 81's RPC restrictions remain intact. There are no payment/provider,
price, Store, billing, grant issuance, Group charge or entitlement-model changes.
The next compatibility slice should attest and reproduce the wallet ledger and
its direct RPC dependencies separately, without adding billing behavior.

Verification started from remote master
`d4ad39b07cc91faeea77e2b947a87c07e3416248` on
`codex/commerce-base-compatibility-foundation`.
Migration 84 canonical LF SHA-256:
`4ba9206d689d24e7c0fd86fd322d92c50162793c018f6c83fbdb50997e5889a6`.

Local verification passed: 462 native Node unit tests; 32 focused commerce-base
PostgreSQL tests; the exact seven-file concurrent Quality Gate command with
83 tests, zero failures and zero skips, including the full 43-migration fresh
release chain and catalog readiness. Architecture, lint, TypeScript, web build
and desktop build passed. Lint retains three existing warnings and the desktop
build retains its chunk-size warning. No UI flow changed and no development
server was started. Production was not accessed or modified.
