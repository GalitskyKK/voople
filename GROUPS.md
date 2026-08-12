# Groups: architecture and authorization

This document is the implementation contract for Voople group chats, sections,
administrative roles and the audit log. Read it together with
`ARCHITECTURE.md`, `MESSENGER.md` and the repository `AGENTS.md`.

## Domain model

- A root row in `chats` with `type = group` is the group and membership boundary.
- A row with `parent_chat_id` is a section inside that group. It inherits root
  membership; `section_access_mode = restricted` may narrow access.
- `chat_members` belongs only to the root group. Its role is `owner`, `admin`
  or `member`.
- There is exactly one owner by product convention. Ownership transfer must be
  implemented as one atomic database operation before owners are allowed to
  leave a group.
- `chat_audit_log` records administrative changes against the root group. It is
  server-only and has no `anon` or `authenticated` grants.

## Authorization matrix

| Action | Owner | Admin | Member |
| --- | --- | --- | --- |
| Read members | yes | yes | yes |
| Invite mutual contacts | yes | yes | no |
| Remove ordinary member | yes | yes | no |
| Remove administrator | yes | no | no |
| Promote/demote administrator | yes | no | no |
| Configure sections and visibility | yes | yes | no |
| Read audit log | yes | yes | no |
| Delete group | yes | no | no |
| Transfer ownership | yes | no | no |
| Leave group | after ownership transfer | yes | yes |

UI visibility is only a convenience. Every query and mutation repeats the
authorization check on the server through `assertChatMemberRest`.

## Code map

- `src/types/chat.ts`: stable group/member/audit view models.
- `src/server/data/chat-access-rest.ts`: canonical membership and inherited
  section-access checks.
- `src/server/data/chat-management-rest.ts`: membership, section and visibility
  persistence.
- `src/server/data/chat-group-audit-rest.ts`: server-only audit persistence and
  mapping. It verifies owner/admin access before returning entries.
- `src/server/trpc/routers/chat.ts`: Zod inputs, rate limits and transport error
  mapping. Business authorization does not live here.
- `src/server/data/chat-group-roles-rest.ts`: owner-only role changes and the
  atomic ownership-transfer RPC adapter.
- `src/server/trpc/routers/chat-group-roles.ts`: isolated transport procedures
  for roles and administrative history.
- `src/components/chat/GroupManagementSheetView.tsx`: shared web/Tauri group UI.
- `src/components/chat/GroupMembersList.tsx`: role and removal controls.
- `src/components/chat/GroupAuditLog.tsx`: readable administrative history.
- `src/components/chat/GroupInviteSheet.tsx`: Next.js tRPC adapter.
- `desktop/src/chat/DesktopGroupInviteSheet.tsx`: Tauri tRPC/upload adapter;
  it must not duplicate the shared view.

## Mutation flow

1. The adapter invokes a typed tRPC procedure.
2. The router validates UUIDs/enums and applies `manageGroupChat` rate limits.
3. The data layer resolves the root membership and checks the actor role.
4. The mutation writes the authoritative row.
5. Administrative mutations append a compact audit event. Details may contain
   only primitive values and must never contain secrets or private media URLs.
6. Web invalidates tRPC caches; desktop invokes its shared refresh callback.

Role mutation rolls the member role back when the audit insert fails.
`transfer_group_ownership` updates both roles and appends its audit event in one
database transaction; it is executable only by `service_role`.

## Database migration

Apply `drizzle/31-chat-group-audit.sql` before deploying code that exposes the
journal or role controls. The migration enables RLS and revokes direct client
access. If Supabase warns that the new table has no client policy, that is
intentional: only the trusted server client may access it.

Never add a broad authenticated `SELECT` policy to the audit table. Membership
and role checks are contextual and remain in the server data layer.

## Adding a permission or audit action

1. Add the action to `ChatGroupAuditAction` and the SQL check constraint in a
   new forward-only migration.
2. Add the server authorization check beside the write, not in the component.
3. Record only IDs and non-sensitive primitive details.
4. Add a human description in `GroupAuditLog` and accessible names to controls.
5. Wire both platform adapters into the same shared view.
6. Verify owner/admin/member behavior, light/dark themes, 360 px width and the
   installed Tauri build.

## Release checks

- Owner can promote and demote an ordinary member.
- Admin cannot promote, demote or remove another admin.
- Member cannot call audit/role procedures even by crafting a request.
- New actions appear newest-first with the actor, target and local timestamp.
- Removed users do not break old history; missing users render a safe fallback.
- Web and desktop show the same tabs, labels, pending states and errors.
- Run architecture, lint, TypeScript and both production builds after changes.
