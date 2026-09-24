import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { parseSystemdUnit } from "./helpers/parse-systemd-unit.mjs";

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
  assert.match(route, /Cache-Control["']:\s*"no-store"/);
});

test("production compose binds only localhost for system Caddy and bounds container logs", async () => {
  const [compose, caddy] = await Promise.all([
    read("deploy/production/compose.yaml"),
    read("deploy/production/Caddyfile"),
  ]);

  assert.match(compose, /web:[\s\S]*ports:[\s\S]*"127\.0\.0\.1:3000:3000"/);
  assert.doesNotMatch(compose, /"(?:0\.0\.0\.0:)?3000:3000"/);
  assert.match(compose, /env_file:\s*\n\s*- app\.env\s*\n\s*- cron\.env/);
  assert.match(compose, /max-size:\s*20m/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(caddy, /voople\.app/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:3000/);
  assert.match(caddy, /health_uri \/api\/health/);
});

test("Selectel systemd timer owns bounded room cleanup without a Vercel scheduler", async () => {
  const [timerSource, serviceSource, command, secretExample, runbook] = await Promise.all([
    read("deploy/production/systemd/voople-room-maintenance.timer"),
    read("deploy/production/systemd/voople-room-maintenance.service"),
    read("deploy/production/bin/voople-room-maintenance"),
    read("deploy/production/cron.env.example"),
    read("deploy/production/README.md"),
  ]);
  const timer = parseSystemdUnit(timerSource);
  const service = parseSystemdUnit(serviceSource);
  assert.equal(timer.Timer.OnCalendar, "*-*-* *:*:00");
  assert.equal(timer.Timer.Persistent, "true");
  assert.equal(timer.Timer.Unit, "voople-room-maintenance.service");
  assert.equal(service.Service.Type, "oneshot");
  assert.equal(service.Service.User, "deploy");
  assert.equal(service.Service.EnvironmentFile, "/opt/voople/cron.env");
  assert.equal(service.Service.ExecStart, "/opt/voople/bin/voople-room-maintenance");
  assert.equal(service.Service.TimeoutStartSec, "30s");
  assert.match(command, /--fail --silent --show-error/);
  assert.match(command, /--max-time 20/);
  assert.match(command, /http:\/\/127\.0\.0\.1:3000\/api\/cron\/expire-group-room-grace/);
  assert.match(command, /--config -/);
  assert.doesNotMatch(command, /https:\/\/voople\.app/);
  assert.match(secretExample, /^CRON_SECRET=$/m);
  assert.doesNotMatch(serviceSource, /^CRON_SECRET=/m);
  assert.match(runbook, /chmod 600 \/opt\/voople\/cron\.env/);
  assert.match(runbook, /systemctl enable --now voople-room-maintenance\.timer/);
  await assert.rejects(access(new URL("../vercel.json", import.meta.url)), { code: "ENOENT" });
});

test("production deploy uses immutable images and pinned SSH trust", async () => {
  const [workflow, deploymentDoc] = await Promise.all([
    read(".github/workflows/production-deploy.yml"),
    read("docs/deploy.md"),
  ]);

  assert.match(deploymentDoc, /voople\.app -> Selectel VDS -> Caddy -> Next\.js standalone container/);
  assert.match(workflow, /web-v\*/);
  assert.match(workflow, /web:\$\{GITHUB_SHA\}/);
  assert.match(workflow, /PRODUCTION_SSH_KNOWN_HOSTS/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/);
  assert.match(workflow, /docker compose up -d --remove-orphans --wait/);
  assert.match(workflow, /test -s \/opt\/voople\/cron\.env/);
  assert.doesNotMatch(workflow, /tar -C deploy\/production -czf - compose\.yaml Caddyfile/);
});
