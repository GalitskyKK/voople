# Voople production web

The application runs as a rootless Docker container bound to
`127.0.0.1:3000`. Host Caddy owns public ports 80 and 443 and proxies
`voople.app` to the container.

Deployments are split deliberately:

- a GitHub-hosted runner builds and pushes an immutable GHCR image;
- the `voople-production` self-hosted runner on the Selectel server pulls and
  starts that image through the deploy user's rootless Docker daemon.

This keeps SSH restricted to the administrator IP. The server must contain
`/opt/voople/app.env` with mode `0600`; it is never stored in GitHub or copied
into an Actions workspace.
