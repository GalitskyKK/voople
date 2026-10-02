# Legacy payment fulfillment compatibility

Migration `86-payment-fulfillment-compatibility.sql` tracks only
`public.payment_intents`, `public.subscription_fulfillments` and
`public.extend_voople_plus_once(uuid, varchar, integer, varchar) RETURNS boolean`.
It reproduces the deployed persistence contract without changing billing,
provider calls, prices, refunds, recurring payments or entitlement writers.

## Evidence and function provenance

The authoritative schema-only production attestation is the user-supplied local
`voople-commerce-attestation.json`, captured at `2026-10-01T11:09:53.405Z`.
Its BOM-stripped, canonical LF SHA-256 is
`240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db`.
No production connection was made during this work.

The attestation supplies a function fingerprint rather than its body. The exact
candidate body was recovered from historical `drizzle/25-commerce-hardening.sql`
and instantiated in disposable PostgreSQL 16. Both the original candidate and
its LF-normalized form produce the attested fingerprint using
`md5(replace(pg_get_functiondef(oid), chr(13) || chr(10), chr(10)))`:
`ef7d9439bb76b3837aa549bae16d8c62`. The schema-only fixture records the verified
definition and catalog contracts. Historical browser EXECUTE grants are not
reintroduced.

Replica identity is not attested for these two tables. The audited contract
uses server REST/RPC calls and has no direct browser or realtime consumer of
either table. Replica identity is intentionally excluded from validation;
no deployed value is inferred or changed during adoption.

## Preserved contracts

Payment intents retain their UUID primary key, cascading user FK, positive
integer amount, varchar lengths, nullable external ID, JSONB metadata and
timestamptz defaults. The user index is `(user_id, created_at DESC)`.
The partial unique index is `(provider, external_id) WHERE external_id IS NOT
NULL`: different providers may reuse an ID, and multiple NULL IDs are allowed.
No kind or status CHECK is invented.

Fulfillments retain a primary key on **external_id alone**, a cascading user FK,
provider varchar(40), period bounds of 1 through 3650 days and timestamptz
creation default. The global external ID key is intentional legacy behavior:
even a retry with another provider or user returns false without extending a
subscription again.

Both tables retain enabled, non-forced RLS and their attested relation grants.
Payment intents expose only the existing own-user SELECT policy; fulfillments
have no browser policy. The broad legacy relation grants include TRUNCATE,
which RLS does not govern. PostgreSQL 17+ MAINTAIN is handled conditionally.
This foundation preserves that attested contract rather than redesigning it.

The RPC is volatile, non-strict, parallel unsafe PL/pgSQL, SECURITY DEFINER with
exact `search_path=public`. Effective EXECUTE is service_role only: PUBLIC,
anon and authenticated must lack it. Fresh creation hardens grants immediately;
adoption validates existing grants without replacing the function or its ACL.
Migration 81 later reasserts the same service-only contract.

## Runtime audit

| Current caller | Existing behavior |
| --- | --- |
| `shop-rest.ts` through `shop.service.ts` | Create/read/update/link payment intents using the admin client; fulfill successful subscription payments through the subscription adapter. |
| YooKassa webhook route | Re-fetch and verify provider payment, then read/update the intent and dispatch fulfillment through the existing service. |
| `subscription-rest.ts` | Sole direct caller of `extend_voople_plus_once`, using the service-role admin client. |
| `promo.service.ts` | Existing plus-trial fulfillment with provider `promo` and `promo:${redemptionId}`. |
| `admin-users-rest.ts` through the admin procedure | Existing subscription grant with provider `admin` and generated external ID. |
| Account export and deletion retention adapters | Read owned payment intents using the admin client. |

There are no direct TypeScript queries of subscription_fulfillments; the RPC
owns those writes. No browser RPC caller was found. Runtime code is unchanged.

## Migration, readiness and ownership

The release prefix is `45 → 82 → 83 → 84 → 85 → 86`, followed by the remaining
tracked migrations beginning with 38, 39 and 43 and ending with 81. There are
45 required migrations. Existing users, subscriptions and subscription_tier
dependencies are reused.

Only absent tables and the absent exact RPC are created. Existing objects are
validated fail-closed against columns, constraints and FK enforcement, indexes,
RLS, effective policies/grants, function signature/properties and body hash.
Compatible extra columns, indexes and triggers survive. Adoption rewrites no
payment, fulfillment or subscription rows and preserves function body and ACL.
Errors roll back new objects and leave no migration-ledger entry. Reapplication
is a checksum-verified no-op preserving ledger metadata.

The new owning Drizzle module declares the same column types, named FKs,
CHECKs, descending index, partial uniqueness and global fulfillment key and is
registered in drizzle.config.ts. It adds no runtime API.

Payment readiness extracts the migration's catalog validation block and runs
inside READ ONLY. It never invokes the fulfillment RPC or performs row writes.

## Verification and remaining work

From verified remote master `157fc3c3c18730333681924d330ec780d7cc6645`, local
verification passed: 466 native Node unit tests, 46 focused PostgreSQL tests,
and the exact nine-file concurrent Quality Gate command with 170 passes,
zero failures and zero skips. Empty PostgreSQL 16 installed all 45 migrations,
passed readiness and retained the four hardened service-only commerce RPCs.
Architecture, lint, TypeScript, web build and desktop build passed; lint retains
three existing warnings and desktop retains its chunk-size warning.

Tests cover attested adoption, schema/ACL/body drift, first fulfillment, active
extension, expired reset, invalid input, retry preservation and atomic rollback.
An overlapping transaction test observes the second RPC waiting on a database
lock, then verifies results `[true, false]`, one fulfillment and one extension.

Migration 86 canonical LF SHA-256:
`519942d13587c153ee2ba36bb75a9a2eeb1f36c6d9c761d09a6afe6c2071bbeb`.

The subsequent [promo compatibility foundation](promo-compatibility.md) tracks
promo codes, promo redemptions and the fingerprint-proven claim_promo_redemption
in migration 87. New monetization or entitlement design remains separate
product work.
