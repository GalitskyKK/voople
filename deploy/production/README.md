# Selectel bootstrap

## Migration execution contract

The core baseline is ordered **45 -> 82 -> 38**, with a future separate commerce
prerequisite still needed before 51. Do not replay historical bootstrap SQL or
claim full fresh-chain reproducibility yet. 82 creates pre-38 core objects only
when absent and validates evolved installations without repairs/data rewrites.
See [core baseline contracts](../../docs/core-baseline-compatibility.md) for
platform prerequisites, read-only readiness, provenance and PostgreSQL proof.

Release migrations are the tracked SQL allowlisted in
`scripts/migration-manifest.mjs`. Apply one explicitly:

```sh
npm run db:apply -- 45-app-schema-migrations.sql
npm run db:apply -- <registered-migration-file.sql>
```

For a future registered `81-example.sql`, the command remains
`npm run db:apply -- 81-example.sql`. No filename, multiple filenames, paths and
non-manifest SQL fail before credentials are loaded or a database is contacted.
Files under `drizzle/` do not authorize execution. Historical, reset, seed and
test-promo files are never implicitly replayed.

The runner takes a database-wide transaction advisory lock, then reads the ledger.
A matching accepted checksum means already applied: no migration SQL and no
metadata update. Both canonical LF and historical CRLF checksums are accepted.
Checksum drift is fatal. Recorded checksum, release version and application time
are immutable in normal operation. A pending migration executes all breakpoint
chunks and inserts its ledger record in the same transaction; any statement or
ledger-insert error rolls back everything. Duplicate-object errors are failures,
not proof that an unregistered migration has been applied. Existing `IF NOT EXISTS`
statements inside reviewed SQL retain their original semantics.

Only migration 45 can run without a ledger. Its unchanged SQL creates the ledger,
performs its existing legacy detection, and receives its own checksum record in
that transaction. If a ledger exists but 45 is unregistered, 45 can run without
overwriting other records. Already registered 45 follows the same checksum/no-op
rules as other migrations. `legacy-detected` / `pre-ledger` entries are evidence
of partial detection, not verified application. Application, pending audit and
readiness reject these entries until a separate verified adoption process exists
for that exact migration. This runner does not implement adoption or broaden
detection. Do not replace sentinel checksums by hand to bypass the gate.

There is no automatic DDL retry. A connection failure or deadline during commit
can leave its outcome unknown. Restore connectivity and inspect the ledger before
retrying: a matching record will skip; an absent record allows an atomic attempt;
a conflicting or legacy record blocks. Never reset tables or rewrite checksums
to recover from an uncertain response. The lock serializes cooperating runners,
not manual SQL or older tooling.

Release promotion iterates the explicit `RELEASE_APPLY_ORDER`, beginning with 45.
The hardened runner verifies/skips matching migrations and applies only pending
ones. Any failure stops promotion. The existing bounded legacy emoji backfill
still follows migration application, then release readiness runs. Pending and
readiness checks only read the ledger/schema; neither applies migrations nor
updates records. These gates still do not certify the missing commerce foundation.

### Transaction compatibility audit at PR #67

Migration `81-legacy-commerce-rpc-privileges.sql` changes only EXECUTE privileges
on six exact attested legacy RPC signatures. Missing functions are skipped, not
created or adopted. It removes PUBLIC/anon/authenticated execution and grants
service_role execution; function owners retain their normal owner privileges.
Release readiness checks effective browser/service privileges and PUBLIC ACLs
for any of these signatures that exist, including inherited browser access.
It does not certify legacy function bodies or complete commerce reproducibility.

All 39 tracked required migrations (38, 39, 43 and 45–80) support one transaction
per file on PostgreSQL 12 or newer. None uses concurrent index operations, VACUUM,
database creation, ALTER SYSTEM, or explicit transaction control. Function-body
`BEGIN` blocks are PL/pgSQL, not commit boundaries. SQL backfills, ordinary indexes,
policies, triggers, grants and replica-identity changes remain transactional.

The only enum additions are:

- `58-room-invitations.sql:3`: `notif_type` adds `room_invite`. Installation does
  not use the label; later migrations/functions run after its commit.
- `77-friendships.sql:2,4`: adds `friend_request` and `friend_accept`. References
  occur in PL/pgSQL bodies that are not invoked during installation. The top-level
  pin cleanup does not use the labels.

No partial-commit exception is needed. The disposable database test installs
these exact bodies against isolated prerequisites and verifies labels after
commit. New migrations must undergo the same audit before registration; enum
labels cannot be added and used by executed statements in the same transaction.

Run the tooling integration test with
`node --test tests/integration/migration-runner.integration.mjs`. It reads only
`VOOPLE_TEST_DATABASE_URL`, skips when absent, and never falls back to operational
database URLs. It requires a disposable local PostgreSQL database with schema/role
creation privileges, or an explicitly approved remote test database. Test objects
and roles use unique names and are removed afterward.

## Host bootstrap

1. Provision Ubuntu 24.04 LTS and attach a reserved public IP.
2. Install Docker Engine, the rootless extras and the Compose plugin from
   Docker's official apt repository. Do not use the unattended convenience
   script in production.
3. Create a non-root deployment user, enable rootless Docker for it and create
   `/opt/voople` owned by that user. Do not add it to the rootful `docker`
   group.
4. Install Caddy from its official apt repository, copy `Caddyfile` to
   `/etc/caddy/Caddyfile`, validate it and enable the system service. This is
   host bootstrap configuration: ordinary app deploys do not upload or change
   the system Caddyfile.
5. Put `.env` and `app.env` in `/opt/voople` from the tracked examples and set
   mode `600`. The deploy workflow uploads only `compose.yaml`; it does not
   update these secrets or system Caddy.
6. If GHCR is private, log in once using a read-only package token.
7. Point `voople.app` and `www.voople.app` to this host and allow public
   80/443. CI SSH uses Tailscale, not a public runner IP.
8. The protected GitHub `production` environment and Tailscale setup are
   already configured. Follow the post-merge commissioning checklist below.

## Private deployment network and commissioning

The existing server is `voople-prod` at Tailscale IPv4 `100.77.197.84`,
tagged `tag:voople-prod`. GitHub Actions joins as an ephemeral
`tag:voople-ci-deploy` node through OIDC workload identity federation. The
tailnet policy permits CI -> production only on TCP 22. SSH is ordinary
OpenSSH with the existing deploy user, key, port, and pinned host key;
Tailscale SSH is not used. Public users still reach Internet -> 80/443 ->
system Caddy -> the Next.js standalone container.

1. Merge this PR while `PRODUCTION_AUTO_DEPLOY` is absent or false. No
   automatic Docker build or deploy should run on that merge.
2. Verify the GitHub `production` environment has secrets
   `TS_OAUTH_CLIENT_ID`, `TS_AUDIENCE`, `PRODUCTION_SSH_USER`,
   `PRODUCTION_SSH_PORT`, `PRODUCTION_SSH_PRIVATE_KEY`, and
   `PRODUCTION_SSH_KNOWN_HOSTS`, plus variable
   `PRODUCTION_TAILSCALE_HOST=100.77.197.84`.
3. Ensure `PRODUCTION_SSH_KNOWN_HOSTS` trusts the Tailscale host identifier.
   Use the exact trusted-key copying and fingerprint commands in
   [the deployment guide](../../docs/deploy.md#trust-the-tailscale-ssh-host-identifier).
   A public-IP-only entry will fail the workflow.
4. Manually run **Production web deploy** with `workflow_dispatch`.
5. Confirm the runner joins Tailscale, reaches `voople-prod` privately,
   verifies its SSH host key, deploys the image tagged with the exact commit
   SHA, passes host-local and public health checks, and populates
   `/opt/voople/.deployed-sha`.
6. Remove the temporary public CI SSH rule in Selectel manually. Keep normal
   public web 80/443.
7. Manually run **Production web deploy** again and confirm success with
   public SSH unavailable.
8. Set repository or production environment variable
   `PRODUCTION_AUTO_DEPLOY=true`. Subsequent pushes to `master` build and
   deploy automatically.

Administrator emergency SSH access is a separate, restricted route to
`voople-prod`, using administrator credentials and independently trusted
host keys. Keep that path available for recovery. Do not grant CI broader
tailnet access or automate Selectel firewall changes in the workflow.

After a successful local health check, the release script writes
`.deployed-sha` and retains the prior SHA in `.previous-sha`. If the new
container fails local health, it attempts one rollback to the prior immutable
GHCR SHA and fails the workflow even when recovery succeeds. A first
deployment has no prior candidate. The runner checks public
`https://voople.app/api/health` afterward; public failure fails the workflow
but does not roll back a locally healthy container. The workflow summary
records the SHA, image, connectivity and health results, and rollback status
without secrets.

## Room grace maintenance on this VDS

The production scheduler is a host systemd timer, not Vercel. Run these from a
repository checkout on the host before the next app deploy (or first transfer
the tracked files over SSH). Ordinary app deploys upload only `compose.yaml`.
The example unit uses deployment user `deploy`; if the actual rootless Docker
user has another name,
change `User=` in the unit to that account before installing it. That user
must own and be able to read `cron.env`.

```bash
sudo -u deploy sh -c 'umask 077; printf "CRON_SECRET=" > /opt/voople/cron.env; openssl rand -hex 32 >> /opt/voople/cron.env'
sudo chmod 600 /opt/voople/cron.env
sudo install -o deploy -g deploy -m 700 -d /opt/voople/bin
sudo install -o deploy -g deploy -m 700 deploy/production/bin/voople-room-maintenance /opt/voople/bin/voople-room-maintenance
sudo install -m 644 deploy/production/systemd/voople-room-maintenance.service /etc/systemd/system/
sudo install -m 644 deploy/production/systemd/voople-room-maintenance.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/voople-room-maintenance.service /etc/systemd/system/voople-room-maintenance.timer
sudo systemctl daemon-reload
```

Restart/redeploy the web container so it receives `CRON_SECRET` from the new
`cron.env` (the normal release workflow does this). Only then enable and test
the timer:

```bash
sudo systemctl enable --now voople-room-maintenance.timer
sudo systemctl status voople-room-maintenance.timer
systemctl list-timers voople-room-maintenance.timer
sudo systemctl start voople-room-maintenance.service
sudo journalctl -u voople-room-maintenance.service -n 30 --no-pager
```

Never put the real token in Git, a unit file, or a shell command argument.
`compose.yaml` reads the same `/opt/voople/cron.env` as the timer and passes
`CRON_SECRET` to the Next.js container. Restart/redeploy the web container
after rotating this file; otherwise the route will reject the timer. A
successful manual start exits 0 and logs the route's JSON cleanup
result. HTTP errors, connection failures and timeouts make the service fail.
The oneshot service cannot overlap itself; it is bounded to 30 seconds, while
the timer runs once a minute.

The `prepare-next-cache` one-shot service runs before `web` and gives the
existing `next-cache` volume to UID/GID `1001:1001`. The web process remains
non-root. Check that the init service exited 0 and that `/app/.next/cache` is
writable as `nextjs` after a release; the web health route alone does not
exercise Next.js image optimization.

Useful checks on the host:

```bash
cd /opt/voople
export XDG_RUNTIME_DIR=/run/user/1000
export DOCKER_HOST=unix:///run/user/1000/docker.sock
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 web
# Run this host-level check from the root maintenance account.
journalctl -u caddy --since=-10m
curl --fail https://voople.app/api/health
systemctl list-timers voople-room-maintenance.timer
```

Rollback uses the previous immutable image SHA:

```bash
cd /opt/voople
export XDG_RUNTIME_DIR=/run/user/1000
export DOCKER_HOST=unix:///run/user/1000/docker.sock
VOOPLE_IMAGE=ghcr.io/owner/repository/web:<previous-sha> docker compose up -d --wait
```

Do not run Postgres, Supabase or LiveKit in this compose project.

## Retire the old Vercel project manually

After the Selectel timer and app have been verified, remove `voople.app` and
`www.voople.app` custom domains from the former Vercel project, disable its
Git auto-deploy, and remove obsolete Vercel preview redirect URLs from
Supabase Auth only after confirming they are unused. The project can remain
without domains as a temporary archive; delete it after a stable Selectel
period. These account changes are not part of the app deployment workflow.
