# Messenger engineering guide

This document covers the client-side messenger shared by the Next.js web app
and the Tauri desktop app. The repository-level layering rules and backend
boundaries remain authoritative in [ARCHITECTURE.md](./ARCHITECTURE.md) and
[AGENTS.md](./AGENTS.md).

## Canonical component map

| Area | Canonical implementation | Responsibility |
| --- | --- | --- |
| Layout | `src/components/chat/MessagesLayout*` | Conversation list, active thread and mobile navigation |
| Conversation list | `ChatListView`, `ChatListSearchPanel`, `ChatListRow` | Local filtering, global people/group search and selection |
| Thread orchestration | `ChatWindow` | tRPC queries and mutations, realtime reconciliation and composition |
| Timeline | `buildChatTimeline`, `ChatMessageBubble*` | Date separators, consecutive-message grouping and attachments |
| Message actions | `ChatMessageMenu`, `ChatSelectionController` | Reactions, reply, edit, copy, selection and batch actions |
| Scroll policy | `useChatAutoScroll` | Stick-to-bottom behavior without stealing the reader's position |
| Selection state | `useChatMessageSelection` | Per-chat selected message identifiers |
| Composer | `ChatComposer` and attachment components | Drafts, reply/edit state, upload, voice, circles and music |

Desktop must not introduce an alternative message bubble, menu or layout.
Platform differences are adapters for upload, navigation, notifications and
global shortcuts. Domain UI continues to come from `src/components/chat`.

## State and data invariants

1. Server and realtime state are authoritative. Optimistic messages are built
   by `src/lib/chat/optimistic-message.ts` and must be reconciled with the
   server result or rolled back after failure.
2. Opening a thread scrolls after layout and late media have settled. When the
   reader is more than 96 px from the bottom, incoming messages must not move
   their viewport; show the jump-to-latest control instead.
3. Selection belongs to the active chat. Switching chats invalidates the
   previous selection, and destructive batch actions require confirmation.
4. A batch delete is exposed only when every selected message is owned by the
   current user. The server still validates ownership and membership.
5. On wide desktop layouts, own messages intentionally join the common
   left-flow/avatar column. Preserve the `2xl:*` variants unless product design
   explicitly changes this behavior.

## Interaction contract

- Desktop: right click opens message actions; Enter or Space opens the same
  menu for keyboard users; double click toggles the quick heart reaction.
- Touch and narrow layouts: tapping a message opens its actions. In selection
  mode, tapping toggles the message instead. A deliberate right swipe beyond
  52 px starts a reply without opening the action menu.
- Conversation rows use a two-line mobile hierarchy: identity and time first,
  latest-message preview second. Group metadata may replace the preview only
  when the conversation has no messages; do not add a permanent third line.
- Selection mode assigns the interaction to the complete message row, not only
  the bubble, so the empty horizontal area remains a valid touch target.
- Menus focus their first item when opened and support Arrow Up/Down cycling.
- Menu and selection transitions should stay in the 120-180 ms range and obey
  `data-reduce-motion="true"`.
- Copying selected messages preserves chronological order.
- All destructive actions require explicit confirmation and a server-side
  authorization check; hiding a client control is not authorization.

## Adding a message action

1. Add a validated server mutation and authorization check when data changes.
2. Expose one explicit callback through `ChatMessageMenuProps`; do not import a
   tRPC client into the visual menu.
3. Close the menu after a successfully initiated local action. Surface failure
   through the thread's error/toast path.
4. Put batch behavior in `ChatSelectionController`; keep identifiers in
   `useChatMessageSelection`.
5. Verify mouse, keyboard and touch at 360, 768 and 1280+ px in both clients.

Forwarding, pinning, saved media and in-thread search require complete backend
paths and permission models. Do not ship decorative local-only controls for
them.

## Release checklist

- Open actions by tap, right click, Enter and Space; navigate with arrow keys.
- Add and remove reactions, including the desktop quick reaction.
- Select mixed authors and confirm delete is unavailable.
- Select only owned messages, cancel once, then confirm deletion.
- Copy several text messages and verify chronological order.
- Scroll upward, receive a realtime message and return with the latest button.
- Re-test reply, edit and upload after leaving selection mode.
- Repeat in web and Tauri, in light and dark themes, including 360 px width.
- Verify reconnect does not duplicate optimistic or realtime messages.
