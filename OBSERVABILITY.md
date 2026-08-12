# Observability

Voople collects a minimal operational signal for crashes and performance. The
transport is shared by Next.js and Tauri, while validation and logging remain on
the server. It is designed for diagnosis, not behavioral advertising.

## Data contract

Accepted events are defined in `src/lib/telemetry/types.ts` and validated again
by `src/app/api/telemetry/route.ts`. Records contain only:

- platform (`web` or `desktop`), pathname without query parameters and time;
- optional public release label;
- sanitized error name/message and at most eight sanitized stack frames; or
- a performance metric name, numeric value and Web Vitals rating.

The client replaces dynamic profile, chat, post, invite and hashtag path
segments with route templates. It also removes email addresses, UUIDs,
token-shaped strings, long secrets and URL query parameters. The API enforces an 8 KiB body limit, strict Zod
schema and 120 requests per minute per source IP. IP addresses are used only as
rate-limit keys and are never written into the telemetry record.

Never add user IDs, usernames, chat IDs, message text, access tokens, media
URLs, request bodies or arbitrary component props to this contract.

## Runtime map

- `src/instrumentation-client.ts`: installs early web error listeners in
  production before hydration.
- `src/components/telemetry/WebVitalsReporter.tsx`: reports Core Web Vitals
  from the smallest possible client boundary.
- `src/lib/telemetry/client.ts`: redaction, deduplication and delivery shared
  by web and desktop.
- `desktop/src/main.tsx`: initializes desktop telemetry and renderer-ready
  timing before React renders.
- `desktop/src/telemetry/DesktopErrorBoundary.tsx`: prevents an uncaught render
  error from becoming an unexplained white window.
- `src/server/services/client-telemetry.service.ts`: emits one-line structured
  JSON into the application logs.

## Operations

Search production logs for `"event":"client_error"` or
`"event":"client_metric"`. Group errors by `release`, `platform`, `route`,
`name` and sanitized `message`. Use Web Vitals distributions rather than
individual values when deciding performance work.

Voople+ records the privacy-safe commercial funnel without user identifiers:
`vooplus_offer_viewed` → `vooplus_checkout_started` →
`vooplus_checkout_ready` or `vooplus_checkout_failed`. A successful payment is
authoritative only in the YooKassa webhook/payment-intent data; client telemetry
must never be used to grant a subscription or calculate revenue.

Set `NEXT_PUBLIC_APP_RELEASE` to the deployment identifier if the hosting
platform does not inject one. Desktop obtains its release from Tauri at runtime.

This first-party log transport is intentionally vendor-neutral. A later Sentry,
PostHog or OpenTelemetry exporter belongs behind the server service; do not add
provider secrets or SDKs to the browser bundle.

## Release checks

1. `POST /api/telemetry` accepts the documented schema and rejects incomplete
   events.
2. Production web logs LCP/CLS/INP without query parameters.
3. A forced desktop render error shows the recovery screen instead of white.
4. No telemetry record contains an email, bearer token, signed media query or
   chat/message content.
