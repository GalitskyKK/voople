# Search after the sidebar UI pass

The wide sidebar palette searches the already loaded inbox for **existing direct
conversations** and **joined Groups**, and uses the existing `search.beta`
query for people. `/search` continues to use `search.beta` for people and
`chat.publicGroups` for public Group discovery. Public discovery is a secondary
link from the palette. The palette does not search message bodies or infer
results from the currently loaded thread.

## Capability map

| Context | Needed results | Existing source | Next server contract |
| --- | --- | --- | --- |
| Global | Existing conversations and joined Groups | `chat.list` (loaded inbox) | A paginated, permission-filtered server search when the inbox can no longer be assumed complete. |
| Global | Contacts and people | `chat.contacts`; `search.beta` on `/search` | Reuse these queries and their visibility rules. |
| Global | Public Groups | `chat.publicGroups` on `/search` | Keep as secondary discovery, respecting public/unlisted/private visibility. |
| Group | Messages in the root Group Conversation and visible sections | None | `search.messages` with `scope: "group"`. |
| Group | Members | Group membership read; no dedicated member search | A member query scoped to the Group, checking membership and profile visibility. |
| Group | Rooms | Group Room read; no dedicated Room search | A Room query scoped to the Group, checking Room visibility and guest grants. |
| Group | Sections/channels | Group section read; no dedicated section search | A section query scoped to the Group, checking section visibility. |
| Direct conversation | Messages | None | `search.messages` with `scope: "conversation"`. |
| Direct conversation | Attachments/media | None | Later, a media index/query with the same conversation access checks and generated media URLs. |

The later contextual UI should derive its label from the open destination:
**В VOICEKK** → Сообщения, Люди, Комнаты, Разделы for a Group; **В этом
диалоге** → Сообщения, then Медиа when attachment search exists, for a direct
conversation. These scopes should appear only after their server queries and
permissions exist. The current global palette must not imply message search.

## Proposed message search boundary

There is no message full-text search procedure in `searchRouter` or
`chatMessageProcedures`. `chat.getMessages` and `chat.observeMessages` return
thread history for display; they are not search endpoints. Add a protected,
paginated query only when a server/data implementation can search persisted
history:

```ts
search.messages({
  scope: "conversation" | "group",
  conversationId?: string, // required only for conversation scope
  groupId?: string,        // required only for group scope
  q: string,               // trimmed, bounded, non-empty
  cursor?: string,         // opaque stable cursor
}) => {
  items: Array<{
    messageId: string;
    conversationId: string; // root DM/Group Conversation or section id
    groupId?: string;
    sectionId?: string;
    sender: { id: string; displayName: string; username: string };
    excerpt: string;
    createdAt: string;     // UTC ISO timestamp
  }>;
  nextCursor?: string;
}
```

The server must derive the viewer from auth, check current DM/Group membership,
then filter each hit by the same section and message visibility rules used for
history reads. Removed members must lose access immediately; blocked user
rules must apply to direct conversation results. A Room guest grant does not
imply access to Group history.
Return only authorized hits and an opaque cursor; never expose private Group
names or message snippets through counts, errors, or pagination. Results need
stable message and conversation/section ids so navigation can open the owning
thread and scroll to the original message. Indexing and pagination must cover
persisted history rather than the client's current message window.
