# Saved Messages

Status: P1 foundation. The storage contract is implemented; transport and UI
remain intentionally unavailable until their complete owner-only slice lands.

`Избранное` is a private message surface owned by one user. It is not a direct
conversation with a synthetic account, not a one-member Group and not a local
draft. Consequently it does not create `chats`, `chat_members`, unread state,
presence, notifications or relationship signals.

## Data boundary

- `saved_messages.owner_id` is mandatory and every server read/write must add
  the authenticated user ID as an equality predicate.
- Browser roles have no table privileges or RLS policy. Only server-side
  service-role code may access the table.
- Client-generated UUIDs provide idempotent retry without duplicating a saved
  message.
- A database trigger rejects replies across owners even if a future server bug
  supplies another user's message ID.
- Text search is owner-scoped and backed by the `simple` PostgreSQL text-search
  index; private content must not enter telemetry or recommendation indexes.
- Attachments reuse the existing private chat upload policy, ownership checks,
  MIME allowlist and size limits. Raw object keys never become public URLs.

## Required surface

The eventual shared web/desktop/mobile View must reuse the existing message
bubble, composer, attachment and reply presentation while keeping an explicit
`Избранное` identity. It needs loading, empty, error, offline/retry, pagination,
search, edit/delete and export/retention states. Until those contracts and
their responsive evidence exist, the route and sidebar entry stay hidden.
