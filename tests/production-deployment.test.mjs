import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production image is standalone, non-root and health checked", async () => {
  const [dockerfile, nextConfig, route] = await Promise.all([
    read("Dockerfile"),
    read("next.config.ts"),
    read("src/app/api/health/route.ts"),
  ]);

  assert.match(nextConfig, /output:\s*"standalone"/);
  assert.match(dockerfile, /FROM node:22-bookworm-slim AS runner/);
  assert.match(dockerfile, /USER nextjs/);
  assert.match(dockerfile, /\.next\/standalone/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/api\/health/);
  assert.match(route, /"Cache-Control":\s*"no-store"/);
});

test("production container is reachable only through host Caddy", async () => {
  const [compose, caddy] = await Promise.all([
    read("deploy/production/compose.yaml"),
    read("deploy/production/Caddyfile"),
  ]);

  assert.match(compose, /"127\.0\.0\.1:3000:3000"/);
  assert.doesNotMatch(compose, /"0\.0\.0\.0:3000:3000"/);
  assert.match(compose, /max-size:\s*20m/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(caddy, /voople\.app/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:3000/);
  assert.match(caddy, /health_uri \/api\/health/);
});

test("production deploy uses an immutable image and an outbound runner", async () => {
  const workflow = await read(".github/workflows/production-deploy.yml");

  assert.match(workflow, /web-v\*/);
  assert.match(workflow, /web:\$\{GITHUB_SHA\}/);
  assert.match(workflow, /self-hosted, linux, x64, voople-production/);
  assert.doesNotMatch(workflow, /PRODUCTION_SSH_/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/);
  assert.match(workflow, /docker compose up -d --remove-orphans --wait/);
});
