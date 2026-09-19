# Production deployment

Production topology for the current stage:

```text
voople.app -> Selectel VDS -> Caddy -> Next.js standalone container
cdn.voople.app -> Selectel CDN/S3
rtc.voople.app -> existing self-hosted LiveKit server
Supabase Auth/Postgres/Realtime -> managed Supabase project
Transactional email -> UniSender Go, auth@voople.app
```

Do not colocate Next.js, LiveKit and a self-hosted Supabase stack on one VM.
They have different scaling, port and failure-domain requirements.

## Server

Recommended initial Selectel VM: Ubuntu 24.04 LTS, 4 vCPU, 8 GB RAM,
80 GB NVMe, public IPv4. The application image is built in GitHub Actions,
so a 2 vCPU / 4 GB / 50 GB VM is a viable low-cost start; 4/8 avoids memory
pressure during image optimization, overlapping deploys and incident analysis.

Open inbound TCP 22 from trusted administrator IPs and TCP 80/443 plus UDP 443
from the Internet. The Next.js port is internal to the Docker network.

The deployment uses Caddy rather than nginx because the current topology is one
web node and Caddy owns automatic TLS renewal, HTTP/2/3 and WebSocket proxying
with a much smaller configuration surface. Reconsider nginx or a managed load
balancer when there are multiple app nodes or specialized traffic policies.

## Files on the server

Create `/opt/voople` owned by a dedicated deployment user in the `docker` group.
Copy `deploy/production/compose.env.example` to `/opt/voople/.env` and
`deploy/production/app.env.example` to `/opt/voople/app.env`. Both real files
must be mode `600` and must never enter Git.

The deployment workflow uploads only `compose.yaml` and `Caddyfile`; it never
overwrites runtime secrets. Authenticate Docker on the server once with a
read-only GitHub token if the GHCR package is private.

## GitHub environment

Create the protected `production` environment. Configure:

- repository variable `NEXT_PUBLIC_SUPABASE_URL`;
- secret `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public at runtime, protected here to
  avoid accidental edits);
- secrets `PRODUCTION_SSH_HOST`, `PRODUCTION_SSH_PORT`,
  `PRODUCTION_SSH_USER`, `PRODUCTION_SSH_PRIVATE_KEY`;
- `PRODUCTION_SSH_KNOWN_HOSTS` captured out of band from the new VM.

Production deploy is deliberate: push a `web-v*` tag or start the workflow
manually. Every release is an immutable `ghcr.io/.../web:<git sha>` image.
Rollback is changing `VOOPLE_IMAGE` to a previous SHA and running
`docker compose up -d --wait` in `/opt/voople`.

## DNS cutover

Create or verify these records before the first release:

| Host | Target |
|---|---|
| `voople.app` | A/AAAA to the application VDS |
| `www.voople.app` | A/AAAA to the same VDS |
| `cdn.voople.app` | Selectel CDN CNAME from the CDN panel |
| `rtc.voople.app` | A/AAAA to the existing LiveKit host |

Use a low TTL during cutover. The old `.ru` domain is not part of the new
runtime and no redirect is required for the pre-launch audience.

## Managed Supabase stays for now

Do not self-host Supabase during the domain cutover. It adds responsibility for
Postgres upgrades and backups, Auth, Realtime, Storage, API gateway, secrets and
mail delivery at the same time as the web migration.

In the managed project:

1. Set Auth Site URL to `https://voople.app`.
2. Add exact redirect URLs `https://voople.app/auth/confirm` and any other
   production callback routes used by the application.
3. Keep localhost URLs only for development; remove obsolete Vercel preview
   patterns after the Vercel deployment is retired.
4. Keep the existing `*.supabase.co` API URL for this migration. A paid
   `api.voople.app` Supabase custom domain can be introduced later without a
   database move.
5. Verify login, registration, reset/OTP, Realtime subscriptions, private
   Storage URLs and RLS after the Site URL change.

Moving only PostgreSQL to Selectel is not a drop-in performance fix: the app
also depends on Supabase Auth, Realtime, Storage and REST semantics. Prepare a
future migration with automated dumps/restores, measured latency, RPO/RTO,
restore drills and a staging cutover. Keep Selectel S3 independent so media is
already portable.

## LiveKit domain

`rtc.voople.app` points to the existing LiveKit host, not the web VDS. Issue a
trusted certificate for the new hostname, update the LiveKit/reverse-proxy and
TURN advertised domains, then change both `LIVEKIT_URL` and
`NEXT_PUBLIC_LIVEKIT_URL` to `wss://rtc.voople.app`. Keep the old hostname only
as a short-lived fallback while already installed desktop builds age out.

Run `npm run check:livekit` against production after DNS and TLS are active.
LiveKit still needs its UDP media port range and TURN/TLS ports; do not route
media through the application Caddy container.

## UniSender and CDN

Verify `voople.app` in UniSender, add the provider-issued DKIM record, merge its
SPF include with any existing SPF record, and add DMARC. Set the sender to
`auth@voople.app`, update templates and test OTP/password mail before disabling
the old sender.

Create `cdn.voople.app` in Selectel CDN, attach its certificate and verify the
existing public bucket origin. Update desktop release variables and
`NEXT_PUBLIC_ASSETS_CDN_URL` only after the new hostname returns assets with
correct CORS and cache headers.

## Release gate

Before switching DNS or tagging a release:

1. `npm run check:architecture`
2. `npm run test:unit`
3. `npm run lint`
4. `npx tsc --noEmit`
5. `npm run build`
6. Build the Docker image and verify `/api/health` through Caddy.
7. Run login/register, chat/realtime, voice join/reconnect, upload, payment
   return and account deletion smoke tests.
8. Confirm container log rotation, disk alerts and a tested rollback image.
