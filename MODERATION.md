# Moderation architecture

Migration 35 introduces `moderation_reports`, the single intake queue for
posts, chat messages, profiles and groups. Reports store a subject reference,
normalized reason and optional 500-character explanation; they never copy the
reported content into the report row.

## Trust boundaries

- Intake validation and subject authorization live in
  `src/server/data/moderation-reports-rest.ts`.
- UI calls tRPC only. Direct browser access to the queue is denied by RLS.
- A reporter must be a member of the relevant chat/group before reporting its
  messages or group. Self-reporting and duplicate reports are rejected.
- Admin queue access continues through `adminProcedure`; moderation decisions
  must write `admin_audit_log` transactionally.

## Extension contract

When adding a new subject type, update the SQL check, `ReportSubjectType`, the
resolver authorization, admin preview loader and action executor together.
Never accept a table name, owner ID, priority or moderation status from a
client. Destructive actions require confirmation, an admin identity and an
immutable audit entry.

The next increment should migrate admin decisions to a generic
`moderate_report` RPC, add message/profile/group actions and provide a safe
appeal workflow. Until then, post actions remain the only destructive action;
other report types are collected but must not be auto-actioned.
