# Data retention matrix

Policy version `2026-08-12-v1` is encoded in
`src/lib/account/retention-policy.ts`. This is an operational engineering
policy, not legal advice. The product owner must have Russian counsel confirm
the durations and legal-hold rules before broad public launch; changing a
duration requires a new policy version and migration review.

| Data class | Active-account purpose | After verified deletion | Maximum retention | Enforcement |
| --- | --- | --- | --- | --- |
| Profile, posts, reactions, follows, status, playlist | Product operation | Delete | Worker execution after 7-day cooling-off period | `public.users` cascade |
| Direct/group messages authored by the user | Conversation history | Delete current authored rows; shared references become unavailable | Worker execution | Relational cascade / `SET NULL` |
| Public user uploads | Profile and social media | Delete owned `post`, `comment`, `avatar`, `banner`, `track` prefixes | Worker execution | S3 prefix deletion |
| Private chat uploads | Messenger attachments | Delete owned private prefix | Worker execution | S3 prefix deletion |
| Group avatar and group-owned configuration | Shared group operation | Preserve with the group; transfer/remaining admins control it | Group lifetime | Deliberately excluded from user prefix cleanup |
| Payment intent and wallet evidence | Accounting, disputes, fraud | Retain only minimal amount/status/provider/timestamps; omit external IDs and metadata | 1,825 days | Pseudonymous deletion audit snapshot |
| Legal consent evidence | Proof of accepted document versions | Retain version/source/timestamp only | 1,825 days | Pseudonymous deletion audit snapshot |
| Deletion audit | Prove request execution and recover interrupted jobs | HMAC subject, policy version, stage code and timestamps only | 1,825 days | `retained_until` purge RPC |
| Application security/telemetry logs | Reliability and abuse response | No content or full auth payload; pseudonymize identifiers | 180 days target | Logging platform lifecycle rule (operator action) |
| Primary database backups | Disaster recovery | Not selectively modified; deleted data ages out | 30 days target | Database provider backup lifecycle (operator action) |
| Email delivery/suppression records | Deliverability and abuse prevention | Provider-controlled minimum necessary record | Provider contract | UniSender account policy (operator review) |
| Legal hold / active dispute | Preserve evidence required for a documented case | Override only the affected classes; record owner, reason and expiry | Case-specific | Future moderation/legal-hold workflow |

## Invariants

- `retention_snapshot` must never contain an email, username, IP, token,
  message/post body, private URL, payment external ID or free-form metadata.
- The audit subject is an HMAC, not a plain or unsalted hash of the user ID.
- No user-facing role can read lifecycle or audit tables through RLS.
- Backups, log storage and UniSender are external retention surfaces and must
  have matching provider-side lifecycle settings; application code alone does
  not enforce them.
- A legal hold is not a hidden permanent flag. It needs a case ID, authorized
  owner, reason, review date and expiry before that feature may ship.
