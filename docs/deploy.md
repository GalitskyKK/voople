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

Keep administrator SSH access separately. The CI SSH path is GitHub Actions
ephemeral `tag:voople-ci-deploy` -> Tailscale -> `voople-prod`
(`tag:voople-prod`, currently `100.77.197.84`) -> TCP 22 -> normal OpenSSH
as the deploy user. Tailnet policy allows this tag pair only on TCP 22.
Tailscale SSH is not used. After private commissioning, remove the temporary
public CI SSH rule in Selectel; do not change public web TCP 80/443.
Internet -> TCP 80/443 -> system Caddy -> Next.js remains public. Docker
publishes Next.js only on host `127.0.0.1:3000`.

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

The protected `production` environment already exists. It contains:

- repository variable `NEXT_PUBLIC_SUPABASE_URL`;
- secret `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public at runtime, protected here to
  avoid accidental edits);
- environment secrets `TS_OAUTH_CLIENT_ID`, `TS_AUDIENCE`,
  `PRODUCTION_SSH_PORT`, `PRODUCTION_SSH_USER`,
  `PRODUCTION_SSH_PRIVATE_KEY`, and `PRODUCTION_SSH_KNOWN_HOSTS`;
- environment variable `PRODUCTION_TAILSCALE_HOST=100.77.197.84`.

The official Tailscale action uses GitHub OIDC workload identity federation,
the two Tailscale secrets above, and only `tag:voople-ci-deploy`. Its runner
node is ephemeral. The deploy job has `contents: read` and `id-token: write`;
the build job has `contents: read` and `packages: write`.
`PRODUCTION_SSH_HOST`, if still present, is ignored.

`workflow_dispatch` runs regardless of `PRODUCTION_AUTO_DEPLOY`. A push to
`master` builds and deploys only when that repository or production environment
variable is exactly `true`. With it absent or false, the gate skips the Docker
build. Keep it false through commissioning. Every release is
`ghcr.io/<repository>/web:<git sha>`; no mutable production tag is deployed.

The host script reads `/opt/voople/.deployed-sha` before changing the release.
After `docker compose up --wait` and a bounded local check of
`http://127.0.0.1:3000/api/health`, it atomically writes the new SHA to
`.deployed-sha` and the old SHA, when available, to `.previous-sha`.
An unhealthy new container triggers one attempt to restore the previous
immutable image and recheck local health. The workflow fails even if rollback
succeeds. On the first deployment there is no rollback candidate, so local
failure leaves no invented state.

Only after local health succeeds does the GitHub runner check
`https://voople.app/api/health`. A failed public check fails the workflow and
appears in its summary, but leaves a locally healthy release running; a
transient public DNS, CDN, or network failure alone does not trigger rollback.

### Trust the Tailscale SSH host identifier

OpenSSH matches the address and port used for the connection. The server host
key is unchanged, but an existing public-IP known-hosts entry does not match
`100.77.197.84`. On an administrator machine with an already trusted entry
for the server's public host, run the following. Replace `PUBLIC_HOST` with
that exact existing known-hosts identifier and `PORT` with the configured
SSH port. For port 22, the identifier is the bare address; for another port
use `[address]:port`.

```bash
PUBLIC_HOST='your-already-trusted-public-host'
PORT=22
PUBLIC_ID="$PUBLIC_HOST"
PRIVATE_ID='100.77.197.84'
if [ "$PORT" != 22 ]; then
  PUBLIC_ID="[$PUBLIC_HOST]:$PORT"
  PRIVATE_ID="[100.77.197.84]:$PORT"
fi
tmp="$(mktemp)"
chmod 600 "$tmp"
cp "$HOME/.ssh/known_hosts" "$tmp"
ssh-keygen -F "$PUBLIC_ID" -f "$HOME/.ssh/known_hosts" |
  awk -v host="$PRIVATE_ID" '!/^#/ && $2 ~ /^(ssh-|ecdsa-|sk-)/ { print host, $2, $3 }' >> "$tmp"
ssh-keygen -F "$PRIVATE_ID" -f "$tmp" >/dev/null ||
  { echo 'No trusted key was copied for the private host' >&2; exit 1; }
# Compare the private entry fingerprint with the already trusted public entry.
ssh-keygen -F "$PUBLIC_ID" -f "$tmp" |
  awk '!/^#/ { print $2, $3 }' | ssh-keygen -lf -
ssh-keygen -F "$PRIVATE_ID" -f "$tmp" |
  awk '!/^#/ { print $2, $3 }' | ssh-keygen -lf -
gh secret set PRODUCTION_SSH_KNOWN_HOSTS --env production --repo GalitskyKK/voople < "$tmp"
rm -f "$tmp"
```

The copied key comes from an already trusted entry, not from an unauthenticated
`ssh-keyscan`. The workflow checks that the private identifier exists and then
uses `StrictHostKeyChecking=yes`; a missing or mismatched key stops deployment.
Keep the trusted administrator access path separate from CI.

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
