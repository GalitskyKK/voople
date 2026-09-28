# Voople engineering rules

These rules are mandatory for AI agents and human contributors. They apply to
the entire repository unless a more specific `AGENTS.md` exists below a
directory.

## Before changing code

1. Inspect the current implementation and nearby tests before editing.
2. This is Next.js 16.3.3. Read the relevant guide in
   `node_modules/next/dist/docs/` before using or changing a Next.js API.
3. Preserve unrelated and uncommitted user changes. Never restore or rewrite
   files merely to make the working tree clean.
4. Prefer the smallest complete change. Do not create a second implementation
   of an existing domain concept.

## Product source gate

Before changing product behaviour or navigation:

1. Read `PRODUCT.md`.
2. Read the relevant accepted technical contract in `ARCHITECTURE.md`
   or `docs/core-rework-architecture.md`.
3. Read `DESIGN_SYSTEM.md` for presentation changes.
4. Read an ADR when the affected domain has one.

`PRODUCT.md` is the single canonical source for current product behaviour.
`ARCHITECTURE.md` and `docs/core-rework-architecture.md` own technical
invariants; `DESIGN_SYSTEM.md` owns presentation; domain ADRs own their
individual architectural decisions. None overrides current product behaviour.

Files under `rework_plan/` and older social/UX plans are historical/reference
material and implementation background. They cannot override `PRODUCT.md`.

When an old specification conflicts with `PRODUCT.md`, follow `PRODUCT.md`
and update stale active documentation in the same slice if it could mislead
future contributors.

Do not delete legacy product code merely because its surface is currently
deferred. Exposure and deletion are separate decisions.

## Product architecture

The dependency direction is:

`app -> components -> hooks/lib/types`

`app/api or trpc routers -> server services -> server data -> integrations/db`

- `src/app`: routing, layouts, metadata and composition only. Pages should not
  contain reusable domain UI or database logic.
- `src/components/<domain>`: UI owned by one domain (`chat`, `profile`, `feed`,
  `shop`, etc.). Shared primitives belong in `components/ui`; shared layout
  belongs in `components/layout`.
- `src/hooks`: reusable client-side orchestration. Hooks must not import server
  modules.
- `src/lib`: framework-light pure logic, constants and client-safe adapters.
  Do not place database access or React components here.
- `src/server/trpc/routers`: validation, authorization and orchestration. Keep
  routers thin.
- `src/server/services`: business rules and multi-source workflows.
- `src/server/data`: persistence queries and row-to-domain mapping.
- `src/server/integrations`: external provider clients.
- `src/types`: stable cross-layer view models. Do not leak raw database rows to
  components.

Client components must never import from `src/server`. Browser code talks to
the backend through tRPC or an API route. Server modules must not import UI.

## Component design

- One file should have one primary responsibility and one exported UI concept.
- Target size: up to 250 lines.
- Review threshold: 251-400 lines. Before adding more, extract a cohesive child
  component, hook, state machine or mapper.
- Hard limit: 400 lines for React component files and 600 lines for server/data
  modules. Existing debt is recorded in `.architecture-baseline.json`; those
  files may shrink but must not grow.
- A React component function should normally stay below 120 lines. Complex
  state/effects belong in a domain hook; visual sections belong in named child
  components.
- Avoid boolean-prop explosions. Use a small explicit variant union or separate
  components when behaviours materially differ.
- Repeated profile/avatar/customization visuals must use their canonical shared
  components. Do not rebuild them with page-specific markup.
- Lists need stable keys; async controls need pending/error states; destructive
  actions need confirmation.

## Next.js and React

- Prefer Server Components. Add `"use client"` only at the narrow interactive
  boundary.
- Do not read secrets from `NEXT_PUBLIC_*`. Server secrets must remain in
  server-only environment variables.
- Keep request-time data on the server unless live client interaction requires
  a query.
- Do not mirror query data into local state without a deliberate editable draft
  model and a synchronization strategy.
- Clean up subscriptions, media tracks, timers and event listeners.
- For active voice calls, server state is authoritative; optimistic UI may be
  used only with rollback/reconciliation.

## UI and UX

- Use existing theme tokens (`--app-*`, `--theme-*`) rather than hardcoded page
  colours.
- Every change must work in light and dark themes and at 360 px mobile width.
- The app shell owns page height. Feature panels scroll internally; avoid
  document-level scrolling inside authenticated pages.
- Persistent controls (call dock, player, mobile navigation) must respect safe
  areas and must not cover composers or primary actions.
- Interactive elements require an accessible name, keyboard support and visible
  focus. Use semantic buttons/links instead of clickable `div`s.
- Empty, loading, error and offline/reconnecting states are part of the feature,
  not optional polish.
- Do not imitate another product literally. Reuse proven interaction patterns
  while keeping Voople terminology and visual system.

## Data, security and reliability

- Validate every external input with Zod or an equivalent schema.
- Authorization is checked server-side for every protected mutation and data
  read; hiding a button is not authorization.
- Never log passwords, tokens, API secrets, private media URLs or full auth
  payloads.
- Use idempotency for payments, rewards and retryable mutations.
- Uploaded files require allowlisted MIME types, size limits, ownership checks
  and generated storage keys.
- Rate-limit authentication, anonymous questions, invitations, uploads,
  reactions and reward claims.
- Store timestamps in UTC and format them in the user's browser timezone.
- Network-dependent UI must tolerate timeout, retry and reconnect without
  duplicating actions.

## Verification

Run final verification from a checkout outside `node_modules`, using the
repository's native Node test command. A TSX run or lint inside `node_modules`
is not equivalent: module resolution and React compiler checks can differ and
hide CI failures. Do not replace failed native tests with a different loader.

Run before handing off a code change:

1. `npm run check:architecture`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build` for routing, environment, server or production-facing UI
   changes.

Also test the affected flow at desktop and mobile widths. Stop local development
servers after verification.

Temporary exceptions to size limits require a narrow entry in
`.architecture-baseline.json` with a reason. Do not raise an exception cap to
make a check pass; refactor the file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
