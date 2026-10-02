# Legacy Group runtime RPC compatibility

Migration `88-group-runtime-rpc-compatibility.sql` tracks the two remaining live
Group invitation/Boost RPC definitions missing from the release chain:

| Function | Production MD5 of canonical LF pg_get_functiondef | Historical candidate |
| --- | --- | --- |
| `public.accept_group_vanity_invite(character varying,uuid) RETURNS uuid` | `762d06821531d44069f819d2588da65b` | `drizzle/44-group-vanity-invite.sql` |
| `public.assign_group_boost_slot(uuid,smallint,uuid,uuid) RETURNS void` | `399ba680326626907d579c3c3619becc` | `drizzle/37-group-boost-slots.sql` |

The user-supplied commerce attestation captured at `2026-10-01T11:09:53.405Z`
is authoritative. Its BOM-stripped canonical LF SHA-256 is
`240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db`.
Each historical candidate was instantiated in disposable PostgreSQL 16 and
matched its production fingerprint using
`md5(replace(pg_get_functiondef(oid),chr(13)||chr(10),chr(10)))`.
The committed fixture contains only verified definitions and schema metadata.
Historical files remain provenance only; their other DDL and grants are not replayed.

Both functions retain PL/pgSQL SECURITY DEFINER, volatile, non-strict, parallel
unsafe, zero default arguments and exact `search_path=public`. Effective EXECUTE
is allowed for service_role and denied for PUBLIC, anon and authenticated.
Absent functions are created already hardened. Existing compatible functions
retain their OIDs, bodies and ACLs. Wrong signatures, extra overloads, metadata,
body hashes or effective privileges fail closed without repair. Runner transaction
rollback removes fresh function creation and the ledger entry on any failure.
The migration does not create tables, seed rows, assign Boosts, join Groups or
change customization/grace data. Reapplying verifies the immutable checksum.

The release prefix is `45 → 82 → 83 → 84 → 85 → 86 → 87 → 88`, followed by the
existing feature migrations, ending at 81. Migration 83 already supplies
subscriptions, group_boosts and group_customization; 82 supplies users, chats and
chat_members. Migrations 38/43/51 neither require these two functions nor change
their required columns. The current required count is 48, including the subsequent
app-theme security migration 89. Migration 81 remains unchanged
and reasserts vanity privileges after creation.

Mandatory `group-runtime-rpc-readiness.mjs` extracts the migration's authoritative
catalog validation block and executes it in a READ ONLY transaction. It requires
both exact functions, their hashes/properties and hardened privileges, without
calling either mutation RPC. The operational readiness CLI and full-chain
integration test invoke it.

## Current server call paths

`/invite/[token] → ChatInvitePage → protected chat.acceptInvite → chat service
→ acceptChatInviteRest → acceptGroupVanityInviteRest → getAdminClient().rpc`.
Arguments are `p_slug: slug` and `p_user_id: userId` from the protected context.
The server adapter checks current vanity eligibility before calling the RPC and
falls back to normal invitations when the vanity lookup returns null.

`protected chat.setGroupBoost → chat service → setGroupBoostRest → admin.rpc`.
Arguments are `p_user_id: userId`, `p_slot: selected slot`,
`p_chat_id: enabled ? chatId : null`, and `p_idempotency_key: idempotencyKey`.
The adapter validates root Group membership, chooses a requested/existing/free
slot and generates a UUID when no idempotency key is supplied. Both direct RPC
calls exist only in server data adapters using the service-role admin client;
there are no direct browser invocations. Product/server source is unchanged.

## Preserved deployed semantics

Vanity acceptance locks the matching group_customization row for a Group chat.
Eligibility is the greater of Boost count (subscriptions expiring later than
now minus 72 hours) and unexpired explicit grace level, with a threshold of 24.
Slug comparison is exact. Missing/ineligible invitations raise an error before
membership checks. An existing member returns the Group UUID; otherwise the
20-member cap is checked and a member row is inserted. RPC calls sharing the
customization row serialize; this does not add locks to other membership writers.

Boost assignment validates slots 1–3, a strictly active subscription and, for a
non-null target, root Group membership. These checks precede idempotency. An
existing user/slot row is locked; a matching key returns without changing it,
even if a different eligible target was supplied. A different target within
seven days raises cooldown. Same-target calls with new keys reset assigned_at
and moved_at. Moving/unassigning an old target records 72-hour grace with its
strictly active Boost count before updating the slot. created_at survives updates.
Unassignment still requires an active subscription and obeys cooldown.

An absent slot has no row to lock. Concurrent first assignments can both pass
that lookup and the later upsert can overwrite the earlier assignment without
an existing-row cooldown/idempotency recheck. This legacy behavior is reproduced
and tested, not repaired here. The tests also cover exact eligibility boundaries,
FK/NOT NULL failures, membership capacity, idempotency-key uniqueness, late-error
rollback, browser denial and existing-row retry serialization.

This closes the two live Group RPC definition gaps only. It does not claim that
the repository's entire historical database is reproducible. Feed/posts/comments/
reposts/hashtags/likes/drafts; profile/status/canvas/questions/reactions/badges/
streaks/anthem/views; moderation/reports; account legal-consent/deletion/retention
workers; and Group ownership transfer remain separate backlog domains.
Style/Full, Store, payments/promos, personal-plan grants, Group charges, Grade
benefits and Boost retirement are outside this slice. The next recommended
implementation is the separately bounded `feat/style-plan-fulfillment`.
