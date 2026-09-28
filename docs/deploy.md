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
from the Internet. Docker publishes Next.js only on host `127.0.0.1:3000`;
system Caddy proxies that local port.

The deployment uses Caddy rather than nginx because the current topology is one
web node and Caddy owns automatic TLS renewal, HTTP/2/3 and WebSocket proxying
with a much smaller configuration surface. Reconsider nginx or a managed load
balancer when there are multiple app nodes or specialized traffic policies.

## Files on the server

Create `/opt/voople` owned by a dedicated deployment user with rootless Docker;
do not add that user to the rootful `docker` group.
Copy `deploy/production/compose.env.example` to `/opt/voople/.env` and
`deploy/production/app.env.example` to `/opt/voople/app.env`. Create
`/opt/voople/cron.env` with one generated URL-safe `CRON_SECRET` and mode
`600`, owned by the deployment user. The web container reads `app.env` and
`cron.env`; the maintenance systemd service reads only `cron.env`. These real
files must never enter Git.

The deployment workflow uploads only `compose.yaml`; it never overwrites
runtime secrets, systemd units or system Caddy. `Caddyfile` is installed during
host bootstrap and changed only by a separate, deliberate host maintenance
operation, followed by Caddy validation/reload. Authenticate Docker on the
server once with a read-only GitHub token if the GHCR package is private.

## Room grace maintenance

Production scheduling belongs to the Selectel host. Install the tracked
`deploy/production/systemd/voople-room-maintenance.service` and `.timer` plus
`deploy/production/bin/voople-room-maintenance` following the exact commands
in [the host runbook](../deploy/production/README.md). The timer runs each
minute and calls `http://127.0.0.1:3000/api/cron/expire-group-room-grace`
without public DNS or TLS. The route checks the bearer `CRON_SECRET` and calls
the service-role-only bounded cleanup RPC. The service exits non-zero for an
HTTP error or timeout; a successful manual run writes a JSON cleanup result
to the journal. The timer has no dependency on Vercel. Provision `cron.env`
and restart the web container before enabling the timer.

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
   patterns after confirming no remaining preview users depend on them.
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
9. Confirm `voople-room-maintenance.timer` is enabled, a manual service run
   succeeds, and `CRON_SECRET` is present in both the timer and web container
   through the shared host file (without printing its value).

The former Vercel project is not a production scheduler or deploy target.
After Selectel is stable, manually remove its `voople.app` and `www.voople.app`
custom domains, disable Git auto-deploy, clean up obsolete Supabase Auth
preview redirects after checking use, and keep the domainless project only as
a temporary archive before eventual deletion. Do not change production DNS as
part of this retirement checklist.
