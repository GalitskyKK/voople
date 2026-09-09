# Saved Messages

Status: deferred gated UI slice. Storage, owner-only transport and a shared web/
desktop surface are implemented behind the internal capability. Migration 67
is applied and registered; authenticated visual evidence and explicit product
promotion remain pending behind the messenger/live IA work.

`Избранное` is a private message surface owned by one user. It is not a direct
conversation with a synthetic account, not a one-member Group and not a local
draft. Consequently it does not create `chats`, `chat_members`, unread state,
presence, notifications or relationship signals.

## Data boundary

- `saved_messages.owner_id` is mandatory and every server read/write must add
  the authenticated user ID as an equality predicate.
- The entire transport is fail-closed behind the internal `saved_messages`
  server capability, so stable clients cannot call it before migration rollout.
- Browser roles have no table privileges or RLS policy. Only server-side
  service-role code may access the table.
- Client-generated UUIDs provide idempotent retry without duplicating a saved
  message.
- A database trigger rejects replies across owners even if a future server bug
  supplies another user's message ID.
- Text search is owner-scoped and backed by the `simple` PostgreSQL text-search
  index; private content must not enter telemetry or recommendation indexes.
- Pagination uses a stable `(created_at, id)` cursor, and every list, search,
  reply, edit, delete and idempotency lookup includes `owner_id`.
- Attachments reuse the existing private chat upload policy, ownership checks,
  MIME allowlist and size limits. Raw object keys never become public URLs.

## Required surface

The shared web/desktop View reuses the existing message bubble, composer,
attachment and reply presentation while keeping an explicit `Избранное`
identity. It includes loading, empty, error/retry, offline draft preservation,
pagination, search and edit/delete states. Its route and sidebar entry stay hidden
unless the server capability is enabled. Optimistic reconciliation with rollback
and draft preservation is implemented. Mobile visual evidence, export/retention
and a later product-priority decision remain required.
