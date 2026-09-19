# Selectel bootstrap

1. Provision Ubuntu 24.04 LTS and attach a reserved public IP.
2. Install Docker Engine, the rootless extras and the Compose plugin from
   Docker's official apt repository. Do not use the unattended convenience
   script in production.
3. Create a non-root deployment user, enable rootless Docker for it and create
   `/opt/voople` owned by that user. Do not add it to the rootful `docker`
   group.
4. Install Caddy from its official apt repository, copy `Caddyfile` to
   `/etc/caddy/Caddyfile`, validate it and enable the system service.
5. Put `.env` and `app.env` in `/opt/voople` from the tracked examples and set
   mode `600`.
6. If GHCR is private, log in once using a read-only package token.
7. Point `voople.app` and `www.voople.app` to this host and allow 80/443.
8. Configure the protected GitHub `production` environment and run
   `Production web deploy` manually for the first release.

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
```

Rollback uses the previous immutable image SHA:

```bash
cd /opt/voople
export XDG_RUNTIME_DIR=/run/user/1000
export DOCKER_HOST=unix:///run/user/1000/docker.sock
VOOPLE_IMAGE=ghcr.io/owner/repository/web:<previous-sha> docker compose up -d --wait
```

Do not run Postgres, Supabase or LiveKit in this compose project.
