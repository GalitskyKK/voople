# Custom nickname colors: fourth Style consumer

`selectCustomNicknameColor` requires active legacy subscription OR active Style
coverage. Full is ignored, including Full-only accounts. This does not finalize
the remaining Style benefits or change other premium customization rules.

The permanent free palette is `#ef4444`, `#f59e0b`, `#22c55e`, `#06b6d4`,
`#3b82f6`, `#8b5cf6`, `#ec4899`, compared case-insensitively. Null/reset uses
default foreground and is free. Any other exact six-digit HEX (`#RRGGBB`) is
custom and requires this capability. Short HEX, CSS names and malformed input
are rejected independently of access.

`profile_customization.nickname_color` is the saved preference. Expiry,
revocation, profile/feed reads and Store overview cleanup never erase it.
Live projection renders a valid custom color only while allowed; denied custom
and malformed legacy values render default/null foreground. Free colors remain
visible. Restoration automatically reactivates the retained custom preference;
explicit free selection or null replaces it. Projection never writes storage.

## Boundaries and rendering

Ordinary customization patches validate color, font and effect separately.
Style can select all three in one patch; it does not unlock premium frames,
frameColor, card base, profile colors, banners or avatar history. Gradient stays
under `selectPremiumNicknameEffect`, independent of custom color.

The legacy Store `nickname_style` equip path still checks ownership and
`requires_subscription`, and non-free custom colors still require legacy
subscription there. It does not receive the new Style color capability.
Purchases, gifting and ownership are unchanged; an item grants no Style access.
Historically equipped Store colors remain saved data and use the same live
projection after entitlement loss.

Profile/mini-profile, feed authors, comments, status posts and repost authors
share the effective mapper. The existing `loadNicknameFontAccessRest` batch
fact serves font/effect/color together, deduplicated in chunks of 200, with one
evaluation instant and joined legacy subscriptions. No new RPC or N+1 reads.
Surfaces that did not expose name color do not gain styling.
The existing Store customization preview uses effective color too; inventory
matching continues to use the saved preference.

New appearance snapshots capture effective profile customization, so denied
snapshots never capture hidden retained custom color. Existing captured
`appearance.customization.displayName.color` stays exactly captured, including
nested reposts; current author entitlement never re-evaluates historical color.

The shared self read exposes saved/effective color and its explicit capability.
The editor keeps free/reset controls enabled, disables the custom picker when
denied, explains retained choices and renders default foreground. Access refresh
uses the existing 30-second/focus/reconnect query and fails closed on errors.
Picker change commits through the server with pending state and rollback;
opening/focusing/blurring it causes no mutation. Font/effect samples use effective
color. Both clients share this editor.

## Database and release

Apply `92-style-nickname-color-write-boundary.sql` before deploying the consumer.
The required migration count is 51. Migrations 89/90/91 remain unchanged.
An independent ALWAYS BEFORE INSERT/UPDATE trigger uses SECURITY INVOKER,
`search_path=pg_catalog` and actual `current_user`, never JWT role claims.

For anon/authenticated, INSERT accepts omitted/null/free colors. UPDATE accepts
unchanged retained values, unrelated fields, reset and every free color. A changed
non-null non-free value is denied, including malformed values and UPSERT inserts.
Service-role writes remain possible through trusted server authorization. No
rows, normalization, subscriptions, grants, payments or Group charges are rewritten;
table grants, RLS and public SELECT remain unchanged.

Readiness verifies the exact body, trigger events/ALWAYS state, invoker, search
path and function privileges. Real PostgreSQL 16/PostgREST tests prove compatible
adoption, checksum no-op, atomic rollback, drift detection, SQL-role spoof
resistance and REST write behavior. The fresh full chain runs in the concurrent
Quality Gate; missing DB services fail in CI with no production fallback.

Run `npm run test:unit`, the exact concurrent integration command in
`.github/workflows/quality-gate.yml`, and
`npx playwright test --config playwright.theme.config.ts`. The shared browser
harness covers web/desktop, 360/1280px and Void/Light; its mocked transport proves
editor behavior while real PostgREST proves database security.
