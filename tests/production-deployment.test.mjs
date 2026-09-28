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
  assert.match(dockerfile, /groupadd --system --gid 1001 nodejs/);
  assert.match(dockerfile, /useradd --system --uid 1001 --gid nodejs nextjs/);
  assert.match(dockerfile, /USER nextjs/);
  assert.match(dockerfile, /RUN mkdir -p \/app\/\.next\/cache\s*\\\s*&& chown -R nextjs:nodejs \/app\/\.next\s+USER nextjs/);
  assert.match(dockerfile, /\.next\/standalone/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/api\/health/);
  assert.match(route, /Cache-Control["']:\s*"no-store"/);
});

test("production cache init owns the shared volume before non-root web starts", async () => {
  const compose = await read("deploy/production/compose.yaml");
  const init = compose.match(/^  prepare-next-cache:\n([\s\S]*?)(?=^  web:)/m)?.[1];
  const web = compose.match(/^  web:\n([\s\S]*?)(?=^volumes:)/m)?.[1];

  assert.ok(init);
  assert.ok(web);
  const images = [...compose.matchAll(/^    image: (.+)$/gm)].map((match) => match[1]);
  assert.equal(images.length, 2);
  assert.equal(images[0], images[1]);
  assert.match(init, /user: "0:0"/);
  assert.match(init, /entrypoint: \["\/bin\/sh", "-ec"\]/);
  assert.match(init, /command: \["mkdir -p \/app\/\.next\/cache && chown -R 1001:1001 \/app\/\.next\/cache"\]/);
  assert.match(init, /volumes:\s*\n\s*- next-cache:\/app\/\.next\/cache/);
  assert.match(init, /network_mode: none/);
  assert.match(web, /depends_on:\s*\n\s*prepare-next-cache:\s*\n\s*condition: service_completed_successfully/);
  assert.match(web, /volumes:\s*\n\s*- next-cache:\/app\/\.next\/cache/);
  assert.doesNotMatch(web, /^\s*user:\s*["']?0/m);
  assert.doesNotMatch(compose, /chmod\s+777/);
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
