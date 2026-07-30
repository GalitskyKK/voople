# Voople desktop renderer rules

These rules extend the repository `AGENTS.md` for `desktop/`.

## One UI source

- Shared layout, navigation, visual components, copy, theme tokens and view
  models live in the root `src/` tree and are imported through the `@` alias.
- Do not copy a web component or its CSS into `desktop/`. If a shared component
  depends on Next.js, split it into a platform-neutral visual component and thin
  web/desktop adapters.
- Files in `desktop/src` may own Tauri bridges, authentication bootstrap,
  platform navigation state, native capabilities and data adapters.
- A visual change that should appear on both platforms must be implemented in
  the shared component first.
- Keep `@source "../";` in `src/app/globals.css`; the Vite renderer needs the
  shared source graph so Tailwind emits classes used by shared components.

## Platform boundaries

- Shared components must not import `next/*`, Tauri APIs, desktop modules or
  server modules.
- Next.js adapters may use `next/link`, App Router hooks and Server Components.
- Desktop adapters may use Tauri APIs and browser-safe clients, but must pass
  serializable view models and callbacks into shared UI.
