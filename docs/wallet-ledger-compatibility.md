# Legacy wallet-ledger compatibility

Migration `85-wallet-ledger-compatibility.sql` reproduces the deployed legacy
wallet ledger and its three RPCs. It creates no wallet rows during migration
and does not change Store behavior or wallet economics. Existing balances and
transaction history are adopted without recalculation, cleanup or backfills.

The production commerce attestation captured on 2026-10-01 supplies the table
contract and function fingerprints. Its canonical LF SHA-256 is
`240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db`.
`tests/fixtures/wallet-ledger.json` records schema metadata and the verified
canonical function definitions, without production rows or credentials.

## Table contract

| Table | Preserved contract |
| --- | --- |
| user_wallets | UUID user PK; public.users FK ON DELETE CASCADE; non-null integer balance_coins DEFAULT 0 with CHECK >= 0; non-null timestamptz updated_at DEFAULT now() |
| wallet_transactions | UUID PK DEFAULT gen_random_uuid(); non-null cascading user FK; non-null integer amount and balance_after; CHECK balance_after >= 0; kind varchar(30) non-null; nullable reference_type varchar(30), reference_id varchar(100), note varchar(200), idempotency_key varchar(200); non-null timestamptz created_at DEFAULT now() |

The normal transaction index is `(user_id, created_at DESC)`. Idempotency uses
exactly UNIQUE `(user_id, idempotency_key)` WHERE `idempotency_key IS NOT NULL`.
NULL keys remain repeatable. The clean production data does not authorize
additional amount, reference or kind constraints.

Both tables retain RLS enabled and not forced, with permissive PUBLIC SELECT
policies using `auth.uid() = user_id`. Broad relation grants to anon,
authenticated and service_role are preserved: SELECT, INSERT, UPDATE, DELETE,
TRUNCATE, REFERENCES and TRIGGER. RLS does not govern TRUNCATE. PostgreSQL 17's
attested MAINTAIN privilege is created/validated only on 17+. PUBLIC has no
relation grants. No browser row-mutation policy is introduced.

Replica identity is absent from the supplied attestation and intentionally
outside this validation contract. The audited wallet runtime uses server
REST/RPC calls; no wallet realtime subscription or tracked logical-publication
dependency was found. Replica identity is neither guessed nor altered on
adoption. A future replication consumer must obtain its own deployed evidence.

## RPC provenance and security

Only the three candidate CREATE FUNCTION definitions were extracted from the
ignored historical `25-commerce-hardening.sql`. No historical migration,
payment/promo DDL or data statements were replayed. Instantiation in disposable
PostgreSQL 16 produced canonical `pg_get_functiondef()` output. Both the original
source and an LF-normalized copy matched the supplied hashes using the original
attestation formula: `md5(replace(pg_get_functiondef(...), CRLF, LF))`.

| Signature | Verified MD5/LF definition fingerprint |
| --- | --- |
| ensure_user_wallet(uuid) -> integer | 1004769927d4c702131ceb1af7866ed9 |
| adjust_wallet(uuid,integer,varchar,varchar,varchar,varchar,varchar) -> integer | c9b520b2129940e0bb1211b90a2b3eb6 |
| purchase_shop_item_with_coins(uuid,varchar) -> integer | d23d824342953c6a5ac6eb1234225ff3 |

All are PL/pgSQL, SECURITY DEFINER, volatile, non-strict, parallel unsafe, have
zero default arguments, and set `search_path=public`. Creation uses these
verified bodies only when the exact function is missing. An unexpected overload
fails closed. Existing definitions and ACLs are never replaced or broadened.

The old attestation's browser EXECUTE grants predate migration 81. Migration 81
owns the current security contract: service_role may execute; PUBLIC, anon and
authenticated may not. Migration 85 establishes that contract immediately for
new functions and rejects unsafe existing execution privileges. Migration 81
later re-asserts it during a full fresh release. Owners and OIDs are not compared.

`ensure_user_wallet` retains the deployed 500-coin welcome credit and one welcome
transaction only when it actually creates a wallet. An existing zero-balance
wallet remains zero. `adjust_wallet` keeps its advisory locking, current-balance
response on repeated keys, transaction insertion and insufficient-balance
protection. A repeated key with a different amount is not reinterpreted as a
new request. Purchase retains the deployed item guards, debit and inventory
insertion. These are compatibility facts, not new billing or idempotency rules.

## Current callers

Every direct call is in `src/server/data/shop-rest.ts`, using `getAdminClient()`.
That client reads SUPABASE_SERVICE_ROLE_KEY, disables session persistence and is
used by the server data/service chain:

| RPC wrapper | Current upstream callers |
| --- | --- |
| getOrCreateWalletRest / ensure_user_wallet | getShopOverview and claimShopItem in shop.service.ts; protected shop overview, claim and refreshed purchase/promo flows |
| creditWalletRest / adjust_wallet | grantAdminCurrencyRest in admin-users-rest.ts through adminProcedure grantCurrency; promo.service.ts voops_bonus through protected applyPromo |
| debitWalletRest / adjust_wallet | Declared server wrapper; no current upstream caller found |
| purchaseShopItemWithCoinsRest / purchase_shop_item_with_coins | shop.service.ts purchaseShopItemWithCoins through protected shop.purchaseWithCoins |

Repository searches found no browser direct RPC call. Runtime code, auth gates,
Store services and payment integrations remain unchanged.

## Release and readiness

Release order is `45 -> 82 -> 83 -> 84 -> 85 -> 38/39/43 -> 46..81`.
All 44 tracked migrations are required. Wallet dependencies are supplied by the
existing core and commerce foundations; they are not duplicated.

Creation occurs only for missing tables/functions. Adoption validates relkind,
required types/typmods, timestamps, collation, defaults, nullability,
generated/identity state, PK/FK/CHECK definitions and validation, FK actions and
enforcement, required index definitions/predicates/validity, RLS, policies and
effective table grants. Compatible extra columns, indexes and triggers survive.
Function validation covers signatures, results, language/security/volatility,
strictness/default arguments, parallel safety, exact configuration, canonical
hashes and effective hardened EXECUTE privileges.

`wallet-ledger-readiness.mjs` extracts only the migration's catalog/function
validation block and runs it inside READ ONLY. The release readiness command
calls it without invoking mutation RPCs. Failure rolls back all newly created
objects and leaves no migration ledger row. Reapplication verifies the canonical
LF checksum and leaves ledger metadata unchanged.

Wallet Drizzle declarations did not previously exist. The new owning schema
module records the attested columns, named cascading FKs, CHECKs, timestamptz
semantics, descending index and partial uniqueness and is registered in
`drizzle.config.ts`. It adds no application API or runtime abstraction.

## Remaining work

The subsequent [payment fulfillment foundation](payment-fulfillment-compatibility.md)
tracks payment intents, subscription fulfillments and extend_voople_plus_once
in migration 86 without changing provider/billing behavior. Promo codes,
promo redemptions and claim_promo_redemption remain unreproducible. Future
wallet redesign, refunds, new prices and entitlement writers remain separate
product work.

Local verification passed from remote master
`1546f1b03c3b73b81fc4461d7ee0e948c0f087db` on
`chore/wallet-ledger-compatibility`: 464 native Node unit tests,
41 focused wallet-ledger PostgreSQL tests, and the exact eight-file concurrent
Quality Gate command with 124 passes, zero failures and zero skips. All 44
migrations installed from empty PostgreSQL 16, readiness passed, and the full
chain preserved the service-only RPC execution contract. Architecture, lint,
TypeScript, web build and desktop build passed. Lint retains three existing
warnings and desktop retains its chunk-size warning. No UI flow changed and no
development server was started. Production was not accessed or modified.

Migration 85 canonical LF SHA-256:
`ede1d751c64f40df4f740c257cca9fdfc4fa35798a27e9ef29173b9f5bd2346e`.
