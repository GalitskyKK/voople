# Anonymous browsing audit (beta)

Room guest entry is separate: `/room-guest/[token]` uses a scoped guest cookie and never grants Group membership.

| Surface | Anonymous state |
| --- | --- |
| `/<username>` | The page accepts a null viewer and loads beta profile data through the server. Public identity can render; viewer-specific fields use the existing privacy mapper. |
| `/group/<slug>` | The page accepts a null viewer and reads only public or unlisted Group metadata for a known slug. Membership and join-request state are absent for guests. |
| `/explore` → `/search` | The route renders, but `UserSearch` calls `search.beta` and `chat.publicGroups`, both protected tRPC procedures. Anonymous discovery therefore fails. |

Do not add a landing “browse without an account” action yet: its discovery destination cannot return the promised People and public Group results anonymously.

The later minimum is a read-only search procedure with explicit public-field mapping and visibility filters, rate limiting, and server-side checks for blocked/private identities and Groups. Then point the search UI at that procedure for anonymous viewers. Keep DMs, Group history, member rosters, joining, invitations, reactions and all mutations behind verified account authorization. Auth prompts should retain the requested public URL as the return destination.
