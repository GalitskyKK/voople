# Legacy promo compatibility

Migration `87-promo-compatibility.sql` tracks `public.promo_codes`,
`public.promo_redemptions` and
`public.claim_promo_redemption(uuid, uuid, varchar, varchar) RETURNS uuid`.
It creates missing objects or validates deployed objects without changing promo
mechanics, rewards, billing or monetization.

## Evidence and provenance

The user-supplied local `voople-commerce-attestation.json`, captured at
`2026-10-01T11:09:53.405Z`, is authoritative. Its BOM-stripped canonical LF
SHA-256 is `240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db`.
The committed fixture contains schema metadata only, not production rows,
credentials, owners or OIDs. Production was not accessed during this work.

The exact historical claim definition was extracted from ignored
`drizzle/25-commerce-hardening.sql` and instantiated in disposable PostgreSQL
16. Both the original source and its LF-normalized form matched the attested
fingerprint `cda399bc55d01e4ed51b653a15fb52ff`, computed with
`md5(replace(pg_get_functiondef(oid), chr(13) || chr(10), chr(10)))`.
Only the verified function definition is tracked; the historical file is not
replayed. Historical browser EXECUTE grants are excluded.

Neither target table has attested replica identity. Current callers use server
REST/RPC, with no direct browser or realtime consumer found. Replica identity
is explicitly excluded from this contract; no deployed value is guessed or
altered during adoption.

## Table and security contracts

Promo codes retain UUID PK/default generation, case-sensitive UNIQUE(code),
varchar lengths 50/40/200 for code/kind/note, non-null JSONB payload DEFAULT
`'{}'::jsonb`, nullable integer max_redemptions, integer redemption_count DEFAULT
0 with CHECK >= 0, integer max_per_user DEFAULT 1 with CHECK >= 1, nullable
timestamptz validity bounds, boolean is_active DEFAULT true and timestamptz
created_at DEFAULT now(). The active index remains `(is_active, code)`.
There is no kind enum, payload schema check, validity-order check or relationship
between max_redemptions and redemption_count imposed by the schema.

Redemptions retain generated UUID PK, non-null cascading promo/user UUID FKs,
nullable varchar(40/100) reference fields and non-null timestamptz redeemed_at
DEFAULT now(). Both indexes remain normal indexes: `(promo_code_id, user_id)`
and `(user_id, redeemed_at DESC)`. There is **no per-user schema uniqueness**.

Both tables have enabled, non-forced RLS and no attested policies. Broad legacy
relation grants to anon, authenticated and service_role are preserved, including
TRUNCATE, REFERENCES and TRIGGER; RLS does not govern TRUNCATE. MAINTAIN is
handled conditionally on PostgreSQL 17+. PUBLIC has no relation grants.

The claim RPC remains volatile, non-strict, parallel unsafe PL/pgSQL SECURITY
DEFINER, with zero default arguments and exact `search_path=public`.
Service_role alone may execute it; PUBLIC, anon and authenticated are denied.
Fresh creation hardens execution immediately. Existing unsafe ACLs fail closed
without replacing the function. Migration 81 reasserts those privileges later.

## Deployed claim behavior

The function selects the promo by ID `FOR UPDATE`. Missing/inactive promos,
future starts and expired ends raise errors. Validity boundaries equal to the
transaction's now() are accepted. A non-null max_redemptions cap is checked
against the stored redemption_count, while max_per_user is checked against the
actual user's redemption rows. NULL caps are unlimited; zero/negative caps
reject claims. Counts are not recomputed from history.

A successful claim inserts one redemption with supplied references, increments
redemption_count and returns that row's UUID. Both writes are atomic inside the
RPC. An invalid user FK or failure during the count update rolls back the whole
claim. Missing promo IDs raise `Promo is inactive` before insertion.

Repeated references are not idempotency keys. Retries can create distinct UUIDs
and consume additional uses until a limit is reached. Concurrent claims lock
the same promo row and recheck limits after the preceding transaction commits.
The function does not read or mutate rewards, wallets, subscriptions or items.

## Current runtime workflow

The only direct RPC caller is `recordPromoRedemptionRest` in server
`promo-rest.ts`, using `getAdminClient()` with the service-role key.
The same adapter reads promo_codes by ID or normalized code and counts owned
promo_redemptions. Runtime normalization trims, uppercases and removes
whitespace; database code uniqueness remains case-sensitive.

| Entry and call chain | Existing subsequent work |
| --- | --- |
| Shop UI → protected, rate-limited `shop.applyPromo` → `applyPromoCode` → `loadEligiblePromo` → `redeemInstantPromo` → claim adapter | Claims first, then parses payload and applies the selected reward. |
| plus_trial | `extendVooplePlusRest` → service RPC extend_voople_plus_once, external ID `promo:${redemptionId}` and provider `promo`. |
| grant_item | Reads shop item and inventory; grants a gifted item only if not already owned. |
| voops_bonus | `creditWalletRest` → adjust_wallet with idempotency key `promo:${promo.id}:${userId}`. |
| subscription_discount | Preview/resolution changes existing payment pricing; no instant claim. Protected payment creation → shop service → provider payment; successful webhook fulfillment extends subscription, then `finalizeSubscriptionPromoRedemption` claims with payment_intent reference, then updates payment status. |

Discount finalization returns without claiming when its existing eligibility
check fails. There is no separate admin promo-table writer or browser direct
table/RPC caller in current source. Admin currency/subscription grants use the
existing wallet/subscription adapters independently of promo redemption.

The overall reward workflow is **multi-step, not atomic**. Payload validation,
item lookup or reward fulfillment can fail after the claim commits. Wallet
idempotency, trial external IDs and inventory ownership checks have their
existing distinct behavior; this migration does not reconcile or redesign them.

## Release, adoption and verification

Release order is `45 → 82 → 83 → 84 → 85 → 86 → 87 → 38 → remaining migrations
→ 81`. There are 46 required migrations. Existing dependencies are reused.
Fresh creation seeds no promos/redemptions and changes no wallet, subscription
or inventory rows. Adoption preserves payload JSON, counts, dates, references,
history, function body/ACL and compatible extra columns/indexes/triggers.

Validation checks ordinary relkind, exact types/typmods/collation, defaults,
nullability and identity/generated state; validated/non-deferrable constraints
and FK enforcement; index definitions, uniqueness, order and validity/readiness/
live state; RLS, policies/grants; and RPC properties, body hash and execution
access. Errors roll back newly created objects and ledger insertion. Repeated
application verifies checksums and preserves ledger metadata.

The owning Drizzle module declares those exact contracts, including named
UNIQUE(code), cascading FKs and normal redemption indexes. Promo readiness
extracts only migration 87's catalog/function validation block and executes it
inside READ ONLY. Neither migration validation nor readiness invokes the RPC.

Verification started from remote master
`64758b3c4f3885b34f94350bf71b683584c08786`: 468 native Node unit tests and
57 focused PostgreSQL tests passed. The exact ten-file concurrent Quality Gate
command passed 227 tests with zero failures/skips. Empty PostgreSQL 16 installed
all 46 migrations, passed every readiness contract and checked five reproduced
commerce RPCs for final service-only execution. Tests include adoption,
schema/security/body drift, row preservation, deployed guards/retries,
overlapping per-user/global-cap claims, rollback and immutable no-op behavior.
Architecture, lint, TypeScript, web build and desktop build passed. Lint retains
three existing warnings; desktop retains its chunk-size warning. No UI flow
changed and no development server was started.

Migration 87 canonical LF SHA-256:
`990d439130cc46a959d983b30141253823b1dfab4a75803bbd46837a5ec19be2`.

This closes the known missing tables and five wallet/payment/promo RPCs in the
legacy commerce compatibility series. It does not certify every deferred
feature RPC: accept_group_vanity_invite remains historical group-invitation work
outside this scope. No runtime promo behavior or monetization model changed.

The first post-compatibility slice should define a recoverable promo claim and
reward-fulfillment contract, then implement narrowly reviewed failure/retry
handling. New plan entitlement issuance and Group charges remain separate
product work governed by the accepted monetization contract.
