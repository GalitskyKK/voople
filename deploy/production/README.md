# Selectel bootstrap

1. Provision Ubuntu 24.04 LTS and attach a reserved public IP.
2. Install Docker Engine and the Compose plugin from Docker's official apt
   repository. Do not use the unattended convenience script in production.
3. Create a non-root deployment user, add it to the `docker` group and create
   `/opt/voople` owned by that user.
4. Put `.env` and `app.env` in `/opt/voople` from the tracked examples and set
   mode `600`.
5. If GHCR is private, log in once using a read-only package token.
6. Point `voople.app` and `www.voople.app` to this host and allow 80/443.
7. Configure the protected GitHub `production` environment and run
   `Production web deploy` manually for the first release.

Useful checks on the host:

```bash
cd /opt/voople
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 caddy
curl --fail https://voople.app/api/health
```

Rollback uses the previous immutable image SHA:

```bash
cd /opt/voople
VOOPLE_IMAGE=ghcr.io/owner/repository/web:<previous-sha> docker compose up -d --wait
```

Do not run Postgres, Supabase or LiveKit in this compose project.
