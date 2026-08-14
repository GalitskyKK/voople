# Voople architecture

This document explains how Voople is assembled, where code belongs and how a
feature must be implemented without creating separate web and desktop products.
Read it together with `AGENTS.md`, which contains mandatory size, security and
verification rules.

## 1. Runtime overview

Voople has two clients and one backend:

```text
Next.js web client ───────┐
                         ├── HTTPS / tRPC ── Next.js API ── Supabase / S3 / LiveKit
Tauri React renderer ─────┘
        │
        └── Tauri IPC ── Rust commands (native window, updater, uploads, hotkeys)
```

- The web application is Next.js 16 with React Server Components where possible.
- The desktop renderer is Vite + React inside a Tauri WebView.
- The desktop renderer does not contain a second backend. It calls the same
  `/api/trpc` endpoint as the web client with a Supabase bearer token.
- Tauri Rust commands are used only when a browser API is insufficient or less
  reliable: global shortcuts, window lifecycle, updater and presigned uploads.
- LiveKit transports realtime audio, camera and screen tracks. Supabase Realtime
  transports lightweight application state such as presence and message changes.

## 2. Dependency direction

Client-side dependency direction:

```text
src/app or desktop/src/shell
  -> src/components/<domain>
  -> src/hooks + src/lib + src/types
```

Server-side dependency direction:

```text
src/app/api or src/server/trpc/routers
  -> src/server/services
  -> src/server/data
  -> src/server/integrations + database/storage providers
```

Dependencies must never point backwards:

- `src/components` cannot import `src/app`.
- browser components and hooks cannot import `src/server`.
- `src/server/data` cannot import UI.
- route files must compose domain components instead of implementing a second
  domain screen.
- desktop modules may import shared `src/components`, `src/hooks`, `src/lib` and
  `src/types`; shared modules must not import `desktop/src`.

## 3. Repository map

### Application entry points

| Path | Responsibility |
| --- | --- |
| `src/app` | Next.js routes, layouts, metadata, server composition |
| `src/app/api/trpc/[trpc]` | HTTP entry point for the typed application API |
| `src/app/api/supabase/[...path]` | controlled Supabase Auth proxy |
| `desktop/src/main.tsx` | desktop React bootstrap and native upload bridge |
| `desktop/src/App.tsx` | desktop providers and authenticated app boundary |
| `desktop/src/shell/DesktopShell.tsx` | desktop routing adapter and shell composition |
| `desktop/src-tauri/src/lib.rs` | Tauri commands and native application lifecycle |

The process-audio boundary is deliberately split further:

- `src/lib/livekit/desktop-process-audio.ts` is the client-safe bridge contract;
- `DesktopScreenAudioSettings` and `useDesktopScreenAudioPublisher` are shared UI/orchestration;
- `desktop/src-tauri/src/process_audio.rs` discovers Windows audio sessions;
- `process_audio_publisher.rs` owns WASAPI Process Loopback and native LiveKit publication;
- the normal release uses `process_audio_publisher_stub.rs` until the Rust LiveKit C++ toolchain
  passes cleanly in GitHub Actions. Do not move PCM through Tauri IPC as a shortcut.

### Shared client code

| Path | Responsibility |
| --- | --- |
| `src/components/ui` | generic primitives: Button, Sheet, DropdownMenu |
| `src/components/layout` | shell, navigation, page geometry and headers |
| `src/components/chat` | messenger, group management and shared chat visuals |
| `src/components/chat/voice` | LiveKit session UI, media stage and call controls |
| `src/components/profile` | canonical profile card, editor, canvas and profile page |
| `src/components/feed` | post cards, composer, comments and repost UI |
| `src/components/shop` | catalog, subscription and shared shop frame |
| `src/components/settings` | shared settings view and platform-injected controls |
| `src/hooks` | reusable browser orchestration and lifecycle handling |
| `src/providers` | application-wide web contexts and realtime providers |
| `src/lib` | client-safe adapters, constants and pure functions |
| `src/stores` | small cross-page Zustand UI stores |
| `src/types` | stable view models shared by clients and server |

### Server code

| Path | Responsibility |
| --- | --- |
| `src/server/trpc/routers` | Zod input validation, auth boundary and orchestration |
| `src/server/services` | business rules and multi-provider workflows |
| `src/server/data` | Supabase/Postgres persistence and row-to-domain loading |
| `src/server/integrations` | external provider clients |
| `src/server/mappers` | persistence row to public view-model conversion |
| `src/server/db/schema.ts` | core Drizzle schema shared by application domains |
| `src/server/db/*-schema.ts` | domain schema modules split out of the legacy central file |
| `drizzle` | local SQL migrations, applied separately before deployment |

### Desktop adapters

`desktop/src` is organized by the same domains as `src/components`. These files
must remain adapters, not alternative designs:

| Path | Allowed responsibility |
| --- | --- |
| `desktop/src/api` | bearer-token tRPC client and auth bootstrap |
| `desktop/src/auth` | Supabase desktop session lifecycle |
| `desktop/src/bridge` | typed browser-to-Tauri bridge helpers |
| `desktop/src/<domain>` | data hooks and platform actions injected into shared views |
| `desktop/src/hotkeys` | local/global shortcut registration |
| `desktop/src/notifications` | Windows permission, realtime bridge and safe native actions |
| `desktop/src/updates` | signed updater checks and restart flow |
| `desktop/src-tauri/src/release_notes.rs` | bounded native history of verified update transitions |
| `desktop/src/providers` | desktop equivalents of application-wide providers |

### Domain ownership map

Use this table to find the complete path of a feature before changing it. A
feature normally crosses one row horizontally; it must not skip from a page
directly to persistence.

| Domain | Shared UI | Client orchestration | Router | Server data/services |
| --- | --- | --- | --- | --- |
| chat inbox/messages | `components/chat/ChatListView`, `ChatWindow` | `hooks/useRealtimeChat`, desktop `useDesktopChats` | `routers/chat.ts` | `chat-rest.ts`, `chat-reactions-rest.ts` |
| groups/sections | `GroupManagementSheetView`, `ChatSectionsBarView` | web `GroupInviteSheet`, desktop `DesktopGroupInviteSheet` | `routers/chat.ts` | `chat-access-rest.ts`, `chat-management-rest.ts`, `chat-discovery-rest.ts`, `chat-community-rest.ts` |
| calls/media stage | `components/chat/voice`, `ChatRoomControl` | `VoiceSessionProvider`, `useVoiceVideoStage` | `routers/chat.ts` | `chat-rooms-rest.ts`, `chat-calls-rest.ts`, LiveKit integration |
| profile/editor | `ProfilePageView`, `ProfileEditSheet`, canonical profile visuals | web `ProfilePage`, desktop `DesktopProfile` | `routers/profile.ts` | `profile-rest.ts`, `customization-rest.ts`, `profile.service.ts` |
| feed/posts | `components/feed/PostCard` and extracted visual children | feed hooks and desktop adapters | `routers/post.ts` | `feed-rest.ts`, `post-hydration.ts`, `post.service.ts` |
| shop/subscription | `ShopPageFrame`, `ShopPageView` | web/desktop shop adapters | `routers/shop.ts` | `shop-rest.ts`, `subscription-rest.ts`, payment integrations |
| settings/account | `AppSettingsView`, `AccountSecuritySettings` | platform settings adapters | `routers/user.ts` | `users-rest.ts`, Supabase Auth integration |
| uploads | shared upload hooks and `lib/uploads` | browser adapter or Tauri native bridge | upload router | `upload.service.ts`, S3 integration |

If a concept is not in the table, first decide which existing domain owns it.
Create a new domain only when it has its own persistent model and lifecycle, not
merely because a page needs another panel.

## 4. Shared UI architecture

The source of truth for geometry and presentation lives under `src/components`.
Use the following naming convention:

- `*View`: complete domain layout with data and actions passed as props.
- `*Visual`: presentation-only building block with no platform transport.
- `*Frame`: repeated page or panel geometry.
- `use*`: state machine or lifecycle orchestration.
- desktop `Desktop*`: authentication, data transport or native adapter around a
  shared view.

Examples already used by both clients:

| Concern | Canonical shared component |
| --- | --- |
| application shell | `AppShellFrame` |
| route padding | `AppPageContent` |
| route title | `SectionPageHeader` |
| navigation | `AppNavigationVisual` |
| messenger columns | `MessagesLayoutView` |
| chat header geometry | `ChatWindowHeaderVisual` |
| message composer surface | `ChatComposerVisual` |
| chat sections | `ChatSectionsBarView` |
| group management | `GroupManagementSheetView` |
| profile page columns | `ProfilePageView` |
| profile card | `ProfileCardVisual` + `ProfileCardBodyVisual` |
| shop route | `ShopPageFrame` + `ShopPageView` |
| settings route | `AppSettingsView` |

Before writing markup in `desktop/src`, search for a matching shared component.
If web and desktop need the same new section, add it to the shared view and pass
the differing action as a callback or rendered slot.

### Correct platform split

```tsx
// shared
export function FeatureView({ items, onSave }: Props) {
  return <FeatureEditor items={items} onSave={onSave} />;
}

// web adapter
<FeatureView items={query.data} onSave={mutation.mutateAsync} />

// desktop adapter
<FeatureView items={data} onSave={(input) => client.mutation("feature.save", input)} />
```

Do not copy `FeatureView` into `DesktopFeatureView`. A new shared callback or
slot is cheaper than maintaining two DOM trees and two CSS implementations.

## 5. Page and scrolling model

`AppShellFrame` owns viewport height. Authenticated routes must not create a
second document-level scrolling system.

- Standard pages use `AppPageContent` and the shell scroll container.
- Messenger routes are fixed-height and scroll the chat list/messages internally.
- Desktop routes are rendered inside `.desktop-shell-scroll`.
- Profile desktop layout keeps the card column fixed and scrolls the post column.
- Call docks, bottom navigation and composers must respect safe-area insets.

Do not add route-specific `lg:px-*`, viewport heights or sticky offsets before
checking the shared shell. Repeated page padding belongs in `AppPageContent`.

## 6. Styling and themes

- Tailwind utilities describe component-local layout.
- Global reusable surfaces live in `src/app/globals.css`.
- Desktop imports the shared global CSS and keeps only Tauri-specific rules in
  `desktop/src/styles.css`.
- Use `--app-*` for application surfaces and borders.
- Use `--theme-*` for user-selected accent/customization values.
- Never hardcode a light or dark page background inside a domain screen.
- Validate every visual change in light/dark themes and at 360 px width.

If a class appears in both web and desktop CSS, move it to the shared stylesheet
or replace it with a shared visual component.

## 7. Data and API flow

### Screen-share media contract

Screen video and application audio are separate tracks. Remote screen tracks use manual
subscription, so an offer does not consume screen bandwidth until the participant presses
**Смотреть**. Desktop application audio connects as a service participant whose metadata contains
`kind=screen-audio`, `ownerId` and `screenSessionId`; it must stay out of participant counters and
camera grids. Its `ScreenShareAudio` track follows the same watch/stop state as the video and uses
an independent `0–200%` local volume.

`chat.roomMediaToken` also returns the server-derived screen-share quality entitlement. The
publisher must use `720p/30` for the standard profile and may request `1080p/60` only for an
active Voople+ subscription or a room whose root group has effective level 24. Never derive this
entitlement from client storage or a UI flag.

The native publisher requires Windows build 20348 or newer. Capability is checked through Tauri
before the source selector is enabled. Web and ordinary desktop builds request selected-surface
audio through `getDisplayMedia` with the full system mix excluded. If Chromium/WebView does not
return an audio track, sharing remains video-only without failing the call or installer build.
When native process audio is active, browser screen audio is disabled to prevent duplicate tracks.

### Post media contract

`src/lib/post-media.ts` is the platform-neutral contract for gallery ordering,
legacy `posts.media_url/media_type` fallback, the ten-item limit and free/Plus
byte limits. Web controls, desktop controls and server services must import it
instead of repeating numeric limits. Presigning is only an optimistic client
check: `upload.service.ts` rechecks ownership, S3 `HeadObject`, MIME and magic
bytes, while `post.service.ts` rechecks the complete ordered batch before the
database write. `post_media` is authoritative; legacy columns remain a rollout
mirror until every deployed client uses the dual-read mapper.

### Web

Interactive web components use the typed `trpc` React client from
`src/lib/trpc/client.tsx`. Server-rendered pages may load through server services.

### Desktop

Desktop hooks use `createDesktopTrpcClient` from `desktop/src/api/trpc.ts`. The
client sends the Supabase access token in the `Authorization` header. Desktop
code should parse untyped transport results at its boundary before passing them
to shared components.

### Adding an API operation

1. Add or reuse a stable view model under `src/types`.
2. Add persistence code under `src/server/data`.
3. Put ownership and cross-provider business rules in `src/server/services`.
4. Add a thin Zod-validated procedure under `src/server/trpc/routers`.
5. Consume the same procedure from web and Tauri adapters.
6. Invalidate or reconcile the affected query caches.

Example mutation shape:

```ts
const input = z.object({ resourceId: z.string().uuid(), enabled: z.boolean() });

setEnabled: protectedProcedure.input(input).mutation(async ({ ctx, input }) => {
  await assertRateLimit(rateLimits.manageResource, ctx.user.id);
  return setResourceEnabled(ctx.user.id, input.resourceId, input.enabled);
});
```

Authorization must be rechecked inside the server workflow. A hidden button is
not an access-control mechanism.

### Concrete end-to-end example: a new group setting

Suppose a group needs `slowModeSeconds`:

1. Add the database column and a migration with a constraint, safe default and
   the required index. Update the appropriate `*-schema.ts` file.
2. Add `slowModeSeconds` to the stable group view model in `types/chat.ts`.
3. Load it in both `listChatsRest` and `listMessagesRest`; otherwise the inbox
   and opened thread will disagree.
4. Add `setGroupSlowModeRest` beside other group persistence. It must resolve
   the root membership and require owner/admin server-side.
5. Re-export the workflow from `chat.service.ts` and expose a Zod-validated,
   rate-limited mutation in `routers/chat.ts`.
6. Put the visual control in `GroupManagementSheetView` or an extracted shared
   child. Do not write separate web and desktop controls.
7. In `GroupInviteSheet` call the typed React mutation. In
   `DesktopGroupInviteSheet` call the same procedure through
   `createDesktopTrpcClient`.
8. Invalidate `chat.list` and `chat.getMessages` after success. For optimistic
   UI, preserve the previous value and roll back on failure.
9. Test an owner, an ordinary member, web and desktop. Directly call the API as
   a member to prove the server rejects it.

### View models versus database rows

Database column names and relation shapes stop in `server/data` or a mapper.
UI receives `displayName`, `groupVisibility` and `avatarUrl`, never
`display_name`, `group_visibility` or a raw Supabase relation array. If a
Supabase relation may be an object or an array, normalize it once in the data
layer instead of spreading that union into component props.

### Cache ownership

- `chat.list` owns inbox order, root-group summaries and visible sections.
- `chat.getMessages({ chatId })` owns one exact thread and its header.
- `profile.byUsername` owns the public profile; editor drafts are local state.
- realtime callbacks invalidate the smallest authoritative query they cannot
  reconcile safely.
- desktop hooks own equivalent local snapshots and expose an explicit `refresh`.

Do not keep a second long-lived copy of query data in component state unless it
is an editable draft. A draft must define what happens when server data changes
while the editor is open.

## 8. Authentication and authorization

- Supabase owns user authentication and sessions.
- `protectedProcedure` verifies the access token; it does not trust a client
  supplied user id.
- `adminProcedure` additionally checks configured administrator ids.
- server-only storage and database clients use secrets without `NEXT_PUBLIC_`.
- public schema tables must have RLS enabled even when the application normally
  accesses them through a service-role server client.
- email or password changes require Supabase reauthentication before update.

Group, message, profile and media operations require server-side ownership or
membership checks for reads as well as mutations.

## 9. Media uploads

The canonical flow is:

```text
client -> upload.createPresigned -> S3 presigned PUT -> domain mutation
       -> server HEAD verifies key owner, MIME and actual size -> persist key
```

- Web uploads through the shared `uploadPresignedFile` adapter.
- Tauri registers a native implementation in `desktop/src/main.tsx` and sends
  bytes through the Rust `upload_presigned_media` command.
- Chat presign requests include `chatId`. The server derives the effective root-group boost
  level and allows 15 MB normally, 50 MB from level 6 and 100 MB from level 12. The same limit,
  object ownership, declared MIME and magic bytes are checked again when the message is sent.
- Never persist a client-provided public URL directly.
- Never add a direct WebView `fetch(presignedUrl)` workaround; it reintroduces
  CORS-dependent `Failed to fetch` failures.
- Every purpose has an owned key prefix and MIME/size allowlist.

## 10. Messenger and group model

- `chats` stores direct conversations, root groups and child sections.
- `parent_chat_id` identifies a section of a root group.
- `chat_members` belongs to the root group; section authorization may further
  restrict that inherited membership.
- `messages` are scoped to an exact chat or section.
- direct chats are normalized by `direct_chat_pairs`.
- group membership and role checks live in `chat-access-rest.ts` and
  `chat-management-rest.ts`.
- shared chat types live in `src/types/chat.ts`.
- `group_visibility=private` requires an administrator addition or accepted
  invitation; public roots are discoverable and use an atomic join function.
- `section_access_mode=inherit` uses root membership; `restricted` additionally
  requires `chat_section_members`, while owners/admins always retain access.
- group appearance is stored separately from membership. Active boosts are
  derived from boost allocations joined to non-expired subscriptions.

When adding a group setting, return it in both the chat-list and thread summary,
then feed it into `GroupManagementSheetView`. Do not implement a web-only sheet.

## 11. Voice, camera and screen sharing

The server is authoritative for room membership and heartbeat state. LiveKit is
authoritative for published media tracks.

Key pieces:

- `VoiceSessionProvider`: application-wide session facade.
- `ChatRoomControl`: device selection and room lifecycle orchestration.
- `configureVoiceRoomEvents`: centralized LiveKit event reconciliation.
- `VoiceRoomStage`: focused/grid media layout.
- `VoiceMiniStage`: movable minimized call surface.
- `useVoiceVideoStage`: attaches each LiveKit video element to exactly one
  visible or parked host; moving a track must not destroy/recreate it.
- `useVoiceHeartbeat`: reconciles server call presence.

Always clean up tracks, event listeners, audio nodes, timers and object URLs.
Test call changes with two real accounts; a single local preview cannot verify
remote mute state, reconnect or track subscription.
The repeatable release matrix is documented in `VOICE_TESTING.md`.

## 12. Presence and realtime

- Online presence uses one Supabase channel: `presence:global`.
- Web and desktop providers publish the same `user_id` payload.
- A server heartbeat persists `last_seen_at`.
- `show_online_status=false` prevents the public API from returning the timestamp
  and prevents realtime presence publication.
- Realtime events invalidate or reconcile tRPC data; they do not replace server
  authorization.

### Desktop system notifications

`DesktopNotificationBridge` is the only renderer-level owner of ordinary
Windows notifications. It subscribes to message and social realtime events,
reconciles the unread counter and applies local notification preferences.
Incoming calls use the same native sender but keep their authoritative call
lifecycle in `App.tsx`.

Message realtime payloads contain only an id and sender id. Before a preview is
shown, `chat.messageNotification` loads a stable view model and verifies group
membership server-side. The desktop must never build a private message preview
from an unverified realtime row. Social text is derived from the canonical
`notificationText` mapper shared with the notification page.

`notifications/native.ts` owns permission requests, action registration,
stable numeric ids and text length limits. Native actions accept only an
allowlisted internal route, restore the main window through Tauri IPC and then
delegate navigation to `DesktopShell`. Do not pass arbitrary or external URLs
through notification `extra` data.

To add a new notification kind:

1. add its stable view model and authorized server read if the realtime payload
   is not already safe for display;
2. add a user preference or map it to an existing explicit category;
3. reuse `showDesktopNotification` and an internal destination;
4. suppress the toast only when the focused app is already showing that exact
   destination;
5. test foreground, background, minimized and fully hidden window states.

## 13. Customization and subscriptions

The server returns a normalized `ProfileCustomizationView`; components do not
read raw database customization rows. Asset registries and entitlement checks
must remain server-authoritative.

- equipped asset ids are not proof of ownership;
- subscription-only state must be cleared or ignored after expiration;
- feed appearance posts contain historical snapshots;
- previews may show locked assets, but saving requires entitlement validation;
- group boosts must be stored as allocations with expiry/revocation semantics,
  not a permanent boolean on the group.

Current group-boost semantics:

- one active Voople+ account can allocate one boost to one root group;
- allocating it elsewhere moves the existing assignment;
- an expired subscription makes the assignment inactive immediately without
  deleting historical configuration;
- effective perks are derived on read from active allocations;
- owners/admins may save the group icon and description; the first active boost
  unlocks the effective custom accent colour;
- a stored group banner becomes effective at level 6 and a stored 2–5 character
  tag at level 12. Losing the level hides the perk without deleting its value;
- avatar and banner keys are accepted only after ownership, object size, MIME
  and signature validation in the upload service. Data modules never trust a
  client-provided storage URL.
- group sounds unlock at level 3. LiveKit transports a rate-limited sound ID,
  not arbitrary URLs or audio bytes; receivers resolve that ID from their
  authorized group-sound list and play the validated CDN asset locally.
- level-24 vanity invitations and role colors remain server-authorized. The public invitation
  preview and the database membership RPC both re-evaluate the current boost/grace level; clients
  never turn a stored vanity slug into an active invitation by themselves.

Future boost perks must use the same derived count. Do not add `is_boosted` or
persist a level that can drift from subscriptions.

## 14. Database changes

1. Update `src/server/db/schema.ts` or the owning `src/server/db/*-schema.ts`.
2. Generate or write a narrow SQL migration in local `drizzle`.
3. Enable RLS for every new public table.
4. Add indexes for membership, ownership and ordered-list access patterns.
5. Apply the migration before deploying code that reads new columns/tables.
6. Verify rollback/recovery implications for destructive changes.

Migrations are intentionally deployed separately. A successful TypeScript build
does not mean production has the required database objects.

## 15. Component checklist

Before adding a component:

1. Search `src/components/<domain>`, `src/components/ui` and `src/hooks`.
2. Decide whether it is a `View`, `Visual`, adapter or state hook.
3. Keep network access out of presentation-only components.
4. Prefer explicit variants over multiple booleans.
5. Add loading, empty, error, offline and pending states.
6. Use semantic buttons/links, accessible names and visible focus.
7. Clean up every external resource in effects.
8. Check both clients if the domain exists on desktop.

## 16. Feature delivery checklist

- database migration applied before dependent deployment;
- protected reads and writes have server authorization;
- external input validated with Zod;
- retryable mutation is idempotent or reconciled;
- web and Tauri use one domain view where possible;
- desktop native bridge has a safe browser fallback or explicit capability state;
- light, dark, mobile and desktop layouts checked;
- two-client call/message flows checked when realtime is involved;
- architecture, lint, typecheck and production builds pass;
- updater version and release metadata changed only when a release is intended.

## 17. Known refactoring boundaries

Architecture checks report existing large components. These files may shrink but
must not grow. Prefer extracting a cohesive state machine or section instead of
raising `.architecture-baseline.json`.

High-priority debt includes `ChatRoomControl`, `ProfileEditSheet`, `PostCard` and
the remaining transport differences between `PostCard` and `DesktopPostCard`.
New work in these domains should reduce duplication as part of the change.

## 18. Pull-request review map

Review a change in this order:

1. migration constraints, RLS and indexes;
2. server read and mutation authorization;
3. stable view-model mapping (no raw rows crossing the boundary);
4. shared UI reuse and desktop adapter size;
5. pending/error/offline handling and cleanup;
6. light/dark/mobile geometry and internal scrolling;
7. cache reconciliation and realtime behaviour;
8. architecture, lint, typecheck, production build and domain runtime tests.

A screenshot proves appearance only. Realtime, authorization, uploads, updater
and calls require runtime evidence from the corresponding boundary.
