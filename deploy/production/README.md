# Selectel bootstrap

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
7. Point `voople.app` and `www.voople.app` to this host and allow 80/443.
8. Configure the protected GitHub `production` environment and run
   `Production web deploy` manually for the first release.

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
