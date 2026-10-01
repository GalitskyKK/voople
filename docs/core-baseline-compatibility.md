# Core baseline compatibility foundation

Migration `82-core-baseline-compatibility.sql` synthesizes the 15-table core
closure from the reproducibility audit at master
`10dc5b5902b5804970b6fd570ab364392fffa073` and the read-only core attestation
captured 2026-10-01 at 12:56:26 UTC. Its header records the evidence's canonical
LF SHA-256. The evolved test fixture retains only schema metadata, with no
production data, counts, owners, OIDs or dependency inventories.

## Authority and order

Historical SQL is provenance, not release authority. 0000 includes unrelated
domains; 04 deletes duplicates; 27 assigns owners from membership order. Other
files mix resets, seeds, data transformations and ad-hoc variants. They are not
newly tracked or replayed. 82 synthesizes only the core foundation.

Required order: **45 -> 82 -> 83 -> 38 -> 39 -> 43 -> 46..81**.
83 supplies the separate legacy commerce prerequisite; see
`docs/commerce-prerequisite-compatibility.md`. 45 remains unchanged and
must inspect the installation before 82 introduces core tables. Fresh 82 omits
`messages.content`, preventing false legacy detection of 39. Existing
`legacy-detected` records still need separately verified operational adoption;
82 never changes their checksum, version or timestamp.

The entire tracked chain now installs from empty on PostgreSQL 16, using the
actual runner and unchanged 38..81 sources. Before 83, 51 failed with
`42P01: relation public.group_boosts does not exist`; 83 supplies that table,
`subscriptions` and the full evolved `group_customization`, including grace
fields. The proof executes 51's capacity/perk functions. It does not certify
every deferred PL/pgSQL body or provide optional legacy payment/shop RPCs.

## Fresh creation versus evolved adoption

Fresh creation supplies the pre-38 shape. Present objects receive validation
only, with no repair, downgrade, replacement or data rewrite. Extra columns,
indexes, constraints, policies, triggers, publication settings and rows survive.

| Surface | Fresh 82 | Evolved adoption/current readiness |
| --- | --- | --- |
| Messages | No content | 39's JSON array content |
| Reactions | Non-null emoji; native composite PK | 39's nullable emoji/custom FK, exclusive-source check, partial unique identities; no old PK |
| Reaction replica identity | Default until 47 | Full after recorded 47; always full in readiness |
| Invite limits | Non-null expiry/max uses | 48 permits null |
| Audit actions | Historical 31 set | 48 also permits group_name_changed |
| Discovery | Private/public; no join_policy | 52's visibility/join-policy contract |
| Legacy Room session | Absent | 58's UUID identity |
| Notification enum | Nine historical labels | 58/77 add room_invite/friend_request/friend_accept in attested order |

Tables: `users`, `chats`, `chat_members`, `messages`, `message_reactions`,
`chat_invites`, `chat_audit_log`, `direct_chat_pairs`, `follows`, `chat_rooms`,
`chat_room_participants`, `chat_section_members`, `notifications`, `posts`,
`playlist_tracks`. Types: `chat_type`, `notif_type`, `post_media_type`,
`track_source`. Attested legacy reply/media message columns are included as core
state because the tracked chain supplies no later owner for those fields.

Validation covers exact column types/typmods and enum namespace, nullability,
defaults, non-generated/non-identity state, validated/non-deferrable PK/unique/
FK/check definitions and deletion actions, valid/ready/live indexes and
predicates, RLS enabled without forced RLS, required policy role/command/body,
required replica identity and invite/audit server-only effective privileges.
Explicit transitional states are allowed in adoption; readiness demands current
evolution. Count-based clean data never creates new constraints.

The reviewed `is_chat_member(uuid)` body is SQL STABLE SECURITY DEFINER with
`search_path=public`, matching root membership through
`COALESCE(requested_chat.parent_chat_id, requested_chat.id)` and `auth.uid()`.
Signature, body, configuration and effective execution access are validated.
Browser roles retain execution for RLS. 81's commerce RPC restriction does not
apply. Incompatible existing helpers are never replaced. Body comparison
ignores whitespace/case but rejects other unreviewed semantic variants.

## Platform and provenance

Supabase owns `auth`, `auth.users(id uuid)`, `auth.uid() -> uuid`, `anon`,
`authenticated`, `service_role` and platform configuration. 82 only checks these
external prerequisites. Built-in UUID generation needs no extra UUID extension.

Provenance: 0000 core columns; 0007 presence; 0008 visibility/section access;
02 policies; 03/04 messages/direct pairs; 05/06 posts Realtime/counters;
07 repost identities; 09 user search; 10 notification Realtime; 11 post trigram
indexes; 15/18 notification labels; 21 media labels; 23 reactions; 24 shared-post
SET NULL; 27 roles/invites/voice; 28 statuses; 29 sections/membership/chats
publication; 30 topic fields; 31 audit; 34 shared-track SET NULL. Historical
owner assignment, deduplication and other data rewrites are excluded.

11 owns both post trigram indexes before 38. Fresh creation therefore provides
only missing `pg_trgm`, or uses its already installed extension schema. It
never moves the extension or installs unrelated Supabase extensions. Adoption
validates indexes instead of recreating them.

All seven core memberships have pre-38 provenance: chats, messages, reactions,
notifications, posts, chat_rooms and chat_room_participants. Newly created
tables join `supabase_realtime` only when present. Plain PostgreSQL may omit the
publication. Existing memberships/settings are preserved. Later feature
publication additions remain owned by their tracked migrations.

## Readiness and verification

The readiness helper extracts only 82's catalog-only validation block and
executes it in a READ ONLY transaction with current-contract checks. There is
one authoritative SQL contract. No application rows are read or mutated.

PostgreSQL 16 CI uses only `VOOPLE_TEST_DATABASE_URL`; no env-file or production
credential fallback exists. Every case creates a fresh generated database on
the dedicated loopback test server, executes unchanged migration sources using
the actual runner, then removes only that generated database. The test-only
shim supplies NOLOGIN roles (service_role bypasses RLS), minimal `auth.users`,
and `auth.uid()` driven by a local test JWT setting. None enters migration SQL.

Tests cover fresh/pre-38 creation, the entire tracked installation through 81,
attested evolved adoption/preservation, schema/security
drift rejection, checksum/ledger no-ops, transactional rollback, read-only
readiness and section-aware RLS against members, outsiders and anonymous users.

Drizzle retains the current evolved schema: shared-post/shared-track SET NULL
and partial reaction uniqueness. No application behavior, navigation, commerce,
payment, promo, Grade or personal-plan behavior changes.

The evidence does not certify dynamic PL/pgSQL dependencies, external consumers,
arbitrary function semantics or every partial-expression uniqueness data check.
A complete tracked installation is distinct from a full deployment with optional
legacy commerce RPCs and external providers. Operational legacy-ledger adoption
remains necessary on installations with legacy-detected records.

Original 82 verification: 452 native unit tests and all 23 PostgreSQL 16 integration
tests passed without skips. Architecture, lint, TypeScript, production web build
and desktop renderer build passed (existing lint/chunk warnings remain). Public
browser smoke passed 11/12 checks, including 360 px and desktop landing checks.
The feed geometry check timed out against the placeholder Supabase backend;
its complete responsive flow remains unverified. No production target was used.
