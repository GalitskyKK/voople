# Voople development workflow

Start with [ARCHITECTURE.md](./ARCHITECTURE.md). It explains the application
layers, domain map, shared web/Tauri components, API flow and extension rules.
`AGENTS.md` contains mandatory engineering constraints.
Desktop-only planned capabilities and their acceptance criteria live in
[DESKTOP_ROADMAP.md](./DESKTOP_ROADMAP.md).

Visual changes must follow [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). It defines
the shared web/Tauri tokens, typography, layout density, motion and responsive
review contract.

Messenger changes must also follow [MESSENGER.md](./MESSENGER.md), which maps
the shared UI, realtime and optimistic-state boundaries, interaction contracts
and release checks for both web and Tauri.

Group roles, privacy, sections and administrative history must follow
[GROUPS.md](./GROUPS.md). It defines the authorization matrix, data flow,
database contract and extension checklist.

Help and first-run changes must follow [HELP_CENTER.md](./HELP_CENTER.md). The
web and desktop clients share the same content and differ only in navigation.

Error reporting and performance changes must follow
[OBSERVABILITY.md](./OBSERVABILITY.md). Its privacy contract applies to both
web and desktop telemetry.

Account export, deletion and retention changes must follow
[ACCOUNT_LIFECYCLE.md](./ACCOUNT_LIFECYCLE.md) and
[DATA_RETENTION.md](./DATA_RETENTION.md). Music/game adapters must follow
[INTEGRATIONS.md](./INTEGRATIONS.md).

Report intake and moderator actions must follow [MODERATION.md](./MODERATION.md).

Call-related releases must also follow [VOICE_TESTING.md](./VOICE_TESTING.md).

## Architecture rule

Web and Tauri use the same domain views from `src/components`. Platform folders
own only routing, authentication transport and native integrations. Do not copy
page markup into `desktop/src`: extend a shared `*View`, `*Visual` or layout
component and pass platform-specific actions into it.

Dependency direction and component size limits are defined in `AGENTS.md`.

Before editing a domain, locate all existing implementations:

```powershell
rg "FeatureName|domain_term" src desktop/src
rg --files src/components/<domain> desktop/src/<domain>
```

If the same layout is needed by both clients, modify a shared `*View`, `*Visual`
or `*Frame`. Platform adapters should provide data, navigation and native actions.

## Web development

```powershell
npm install
npm run dev
```

The web application is available at `http://127.0.0.1:3000`.

## Desktop development

```powershell
cd desktop
npm run tauri:dev
```

This starts Next.js on port 3000, Vite on port 1420 and the Tauri window. Keep
the terminal open: Vite, Next.js and Rust logs are combined there.

For Rust backtraces and verbose native logs:

```powershell
npm run tauri:dev:debug
```

Frontend errors are visible in the Tauri WebView DevTools console in a debug
build. Network calls to Voople API are visible on the Network tab. Native upload,
window, updater and heartbeat errors are printed in the terminal.

If a previous run left ports occupied:

```powershell
npm run dev:stop
```

The script stops listeners on ports 1420 and 3000 only when their command line
belongs to this repository. An unrelated process is reported but never killed.

## Desktop upload flow

The WebView requests a presigned URL through tRPC. The file bytes are sent by
the Rust `upload_presigned_media` command, avoiding WebView CORS differences.
The server verifies ownership, actual object size and MIME before persisting a
post or chat message. Do not add direct `fetch(presignedUrl)` calls in desktop
components; use `uploadPresignedFile`.

Web chat attachments use the same presigned flow and must pass the exact `chatId` to
`upload.createPresigned`. Do not reintroduce multipart uploads through a Next.js route for large
group files: serverless request-body limits and proxy timeouts will surface as `Failed to fetch`.
Group file limits are resolved server-side from membership and the effective boost level, then
verified again by `sendMessage` after `HeadObject` and file-signature inspection.

## Database migrations

Database changes are applied separately from the public repository. Before
deploying code that uses a new table, apply the corresponding SQL file from the
local `drizzle` directory in the Supabase SQL editor, then deploy the API and
clients. For the current unreleased changes, apply these files in order:

1. `drizzle/0006_profile_pinned_posts.sql`;
2. `drizzle/0007_user_presence_privacy.sql`;
3. `drizzle/0008_group_and_section_privacy.sql`;
4. `drizzle/0009_public_group_join.sql`;
5. `drizzle/0010_group_customization_and_boosts.sql`;
6. `drizzle/0011_group_public_slugs.sql`;
7. `drizzle/0012_group_avatar.sql`;
8. `drizzle/31-chat-group-audit.sql`;
9. `drizzle/32-legal-consents.sql`;
10. `drizzle/33-account-deletion-requests.sql`;
11. `drizzle/34-account-deletion-worker.sql`;
12. `drizzle/35-unified-moderation-reports.sql`.
13. `drizzle/36-post-media.sql`;
14. `drizzle/37-group-boost-slots.sql`;
15. `drizzle/38-group-emojis.sql`;
16. `drizzle/39-structured-chat-content.sql`;
17. `drizzle/40-cloud-post-drafts.sql`.
18. `drizzle/42-group-banner-tag.sql`.
19. `drizzle/43-group-sounds.sql`.
20. `drizzle/44-group-vanity-invite.sql`.

Migrations 36–44 are an expand-first rollout. Post media remains dual-read and new posts mirror
their first attachment to legacy columns until old desktop versions have aged out. Do not remove
legacy fields in the same release. Boost slots, custom emoji nodes and drafts require their server
authorization path; do not expose direct permissive RLS writes.

Migration 42 adds nullable group banner and tag fields. The saved values are retained during a
boost grace period or level loss, while read mappers expose them to chat/public UI only when the
effective group level is high enough (banner: 6, tag: 12).

Migration 43 adds the group soundboard. Uploads are staged under the user-owned
`group-sound` prefix, validated by `HeadObject` and audio metadata, then copied to a stable
group-owned key. The database function rechecks admin membership and the effective level under
an advisory transaction lock before enforcing the 8/16/32/48 limits.

Migration 44 adds the unique permanent `/invite/<slug>` address and role colors for level-24
groups. Preview and membership insertion both re-check the effective level; the database
function locks the group customization row before checking the member limit and inserting a
member. Saved link and role colors remain stored when the level drops but are not exposed as
effective presentation until the level returns.

The first migration may trigger the Supabase warning about a new table without
RLS. Choose **Run and enable RLS**. Later migrations explicitly enable RLS, but
still verify it in the dashboard before deployment. These tables are accessed
through authorized server workflows; do not add permissive browser policies as
a shortcut.

`32-legal-consents.sql` creates a server-only immutable registration consent
log and an `auth.users` trigger. Apply it before publishing the registration UI
that writes `privacy_version` and `terms_version` metadata. The table has RLS
enabled and no policies for `anon` or `authenticated`.

`33-account-deletion-requests.sql` stores cancellable lifecycle requests.
`34-account-deletion-worker.sql` adds email verification state, a service-only
lease/claim RPC and pseudonymous deletion evidence. Apply migrations 32-34 before
deploying the re-consent gate because authenticated clients fail closed when
the server cannot verify current document versions.

The account lifecycle design, export scope and deletion operator procedure are
documented in `ACCOUNT_LIFECYCLE.md`.

## Required verification

```powershell
npm run check:architecture
npm run lint
npx tsc --noEmit
npm run build

cd desktop
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Desktop release command

Run `npm run release` only from a clean `master` that exactly matches
`origin/master`. The interactive command proposes a semantic version, builds
release notes from commits after the latest `desktop-v*` tag, synchronizes all
desktop version files and runs the complete web, desktop and E2E verification
chain. It shows the resulting diff before asking for a separate publish
confirmation. Answering no restores the edited version files; a failed check
does not create or push a release tag.

After confirmation the command creates one release commit, an annotated
`desktop-vX.Y.Z` tag and pushes both atomically. GitHub Actions owns updater
signing and publication; the local command never reads signing secrets.
Database migrations under `drizzle/` intentionally remain local in this
private deployment workflow and must be applied and recorded operationally
before publishing a release that depends on them.

`npm run lint` may print existing warnings, but new work must not add errors or
new warnings. `npm run check:architecture` must pass without increasing baseline
limits.

## End-to-end smoke tests

Playwright covers release-critical browser boundaries without replacing the
two-device call matrix. Public tests validate the landing conversion actions,
authentication entry points, protected-route redirect and desktop download
route. Authenticated tests validate that a real session can open the messenger
and navigate settings without mutating production data.

Install the Chromium runtime once, then run:

```powershell
npx playwright install chromium
npm run test:e2e:public
npm run test:e2e
```

`npm run test:e2e` starts the local Next.js server when
`PLAYWRIGHT_BASE_URL` is absent. To exercise an existing deployment, set it to
an HTTPS origin. The authenticated project is included only when all of these
variables exist:

```text
E2E_SUPABASE_URL
E2E_SUPABASE_ANON_KEY
E2E_USER_EMAIL
E2E_USER_PASSWORD
```

Use a dedicated verified account with no administrator rights, payments or
private production conversations. Never use a maintainer's account. Playwright
creates `playwright/.auth/user.json` at runtime; the directory, report, traces
and failure videos are ignored by Git. Do not attach a trace publicly until it
has been checked for personal chat content.

The scheduled `E2E smoke` GitHub Action targets `https://voople.ru`. Add the
four `E2E_*` values as repository Actions secrets to enable authenticated
checks. If they are absent, the same workflow intentionally runs only the
public project. A failing smoke test blocks confidence in a release but does
not roll back production automatically.

## Common feature workflow

For a feature that reads or writes server data:

1. define/update the view model in `src/types`;
2. add persistence in `src/server/data`;
3. add authorization and business rules in `src/server/services`;
4. expose a validated procedure in `src/server/trpc/routers`;
5. add the shared view under `src/components/<domain>`;
6. connect it through the web tRPC React client;
7. connect the same view through `createDesktopTrpcClient` in Tauri;
8. verify cache invalidation, errors, retry and pending state.

For visual-only changes, begin at the canonical shared component listed in
`ARCHITECTURE.md`, not inside a route or `Desktop*` component.

## Debugging guide

### Web API

- Browser Network shows `/api/trpc/*` status and response.
- Next.js server exceptions are printed in the terminal running `npm run dev`.
- Supabase database/auth errors are available in the corresponding dashboard logs.
- Never paste access tokens or complete auth payloads into an issue.

### Desktop

- renderer exceptions: Tauri WebView DevTools Console;
- tRPC and auth: WebView Network tab;
- Rust/native commands: `npm run tauri:dev:debug` terminal;
- occupied ports: `npm run dev:stop`, then start again;
- updater: inspect the updater status UI and release endpoint response;
- release notes: Settings → Window → `Что нового` reads only locally recorded,
  verified update transitions; a clean install correctly has an empty history;
- native notifications: check Windows notification permissions, then inspect
  the desktop renderer log for the originating realtime/tRPC failure without
  logging message text or access tokens;
- `Failed to fetch` during upload usually means a direct WebView PUT was added
  instead of the shared native upload adapter.

### Voice calls

Record both clients' states: room id, connection state, published/subscribed
tracks and server heartbeat response. Do not log LiveKit tokens. Verify mute,
camera and screen state from the other account, not only the publishing client.

Voice UI is shared by web and Tauri under `src/components/chat/voice`:

- `ChatRoomControl` owns the LiveKit room lifecycle and is the only composition
  boundary that may coordinate server membership with media tracks;
- `VoiceRoomSheet` owns the compact/fullscreen shell, while `VoiceRoomStage`
  owns focus/grid placement and internal participant scrolling;
- `VoiceSessionDock` is the persistent movable/resizable view outside the room;
- media capture policy belongs in `voice-room-config.ts`; do not put browser
  constraints in buttons or views;
- voice preferences are persisted through `src/lib/livekit/voice-preferences.ts`.

Full system-output capture remains disabled. Web and normal desktop builds request audio from the
selected tab/window through `getDisplayMedia`, exclude the system mix and continue video-only when
Chromium/WebView returns no audio track. The experimental desktop adapter can enumerate Windows
audio sessions, capture one process tree through WASAPI Process Loopback and publish it with a
native LiveKit participant, thereby excluding Вупл. playback. Keep that Cargo feature disabled in
production until `npm run tauri:build:process-audio`, the GitHub/MSVC toolchain and the full matrix
in `VOICE_TESTING.md` pass. Native audio automatically replaces browser capture rather than running
beside it, preventing duplicate screen-audio tracks.

Before a desktop release, test with two accounts on separate devices:

- login, registration and email confirmation;
- direct and group messages, image, voice and circle uploads;
- voice call, mute state, camera, screen sharing and reconnect;
- profile editor uploads and live preview;
- updater discovery, download, signature verification and restart.
- post-update `Что нового`: it opens once for the installed version, closes with
  Escape and remains available from Settings without reopening on every launch.
