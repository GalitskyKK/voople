# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Voople is for people and small communities that want to stay socially present
through chat, voice rooms, shared media, mood and profile identity without
turning every interaction into a public post. The initial product work targets
connected groups that already communicate elsewhere and need a credible reason
to move a live conversation into Voople.

## Product Purpose

Voople combines messaging, live Rooms and expressive profiles in one social
space. The core loop is: see what your people are doing, join or start a
conversation with little friction, then retain useful context in messages and
the profile instead of losing it when the live moment ends.

## Positioning

The product is organized around live social context rather than a server list
or a broadcast-only feed: people, Rooms, messages, mood, music and profile
identity are parts of the same relationship graph.

## Operating Context

- Web is the public entry and discovery surface, including safe invite previews
  and guest entry.
- Desktop is the primary rich communication client and owns native media,
  screen sharing, deep links and update behavior.
- Mobile web must remain usable at 360 px. Native Android and iOS clients are a
  planned platform layer over shared contracts, not separate product forks.
- A Room guest enters one exact live conversation and does not become a Group
  member automatically.

## Capabilities and Constraints

- The target social model is `People -> Conversation -> Room`; Group is a
  durable conversation type, not the root navigation metaphor.
- Lobby is a Room and can coexist with temporary and pinned Rooms.
- Messages belong to a DM, Group Chat or section. Room context is an attached
  snapshot, not a second message-history lifecycle.
- Server state is authoritative for membership, authorization, active Rooms and
  media credentials. Public links use short-lived opaque secrets stored only as
  hashes.
- Guest access is limited to the exact live Room. Permanent membership, full
  history, direct messages, notifications and durable identity require an
  account.
- Product analytics must not contain message content, private media identifiers,
  auth tokens or raw invite secrets.
- UI must support Void and Light themes, keyboard access, reduced motion and
  responsive widths of 360, 390, 1024 and 1440 px.
- The canonical product sources remain the authority for behavior and design:
  `temp_info_for_redesign_and_improvement/VOOPLE_PROJECT_SPEC.md`,
  `temp_info_for_redesign_and_improvement/VOOPLE_FINAL_PRODUCT_SOCIAL_UX_IMPLEMENTATION_PLAN.md`,
  `temp_info_for_redesign_and_improvement/VOOPLE_REFERENCE_MAP.md`,
  `temp_info_for_redesign_and_improvement/VOOPLE_DESIGN_RULES.md`, the tracked
  core rework plan and its approved addendum summary.

## Brand Commitments

The product name is Voople. Existing logo assets, Voople terminology and theme
tokens are preserved. Reference products may supply interaction patterns and
information hierarchy, but Voople must not literally imitate their branding or
cosmetic system. Product copy should be direct, conversational and specific.

## Evidence on Hand

The repository contains working web and Tauri desktop clients, production UI
screenshots, two design reference boards, a product specification, a staged
core-rework plan, a delivery matrix and automated architecture, unit, browser
and release gates. Market demand and migration willingness are not yet proven;
the validation programme remains a P0 product task and future UI must not invent
customers, testimonials or adoption claims.

## Product Principles

1. The useful social action is visible and reachable before secondary chrome.
2. Live participation is low-friction, but access boundaries are explicit and
   enforced on the server.
3. Web, desktop and future mobile clients share product and data contracts while
   respecting platform-native interaction details.
4. New architecture ships in additive, reversible slices with compatibility for
   supported clients.
5. Visual fidelity includes loading, empty, offline, error, reconnect and narrow
   viewport states; a static shell is not a completed feature.

## Accessibility & Inclusion

Interactive controls require semantic elements, accessible names, keyboard and
visible-focus behavior. Motion must respect reduced-motion preferences, layouts
must remain usable at 360 px, and meaning cannot rely on color alone.
