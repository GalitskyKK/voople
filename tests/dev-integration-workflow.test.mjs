import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const triggers = (path) => read(path).split("\non:\n")[1].split(/^\S/m)[0];

test("dev pushes and PRs into dev run the same repository quality gate", () => {
  const workflow = read(".github/workflows/quality-gate.yml");
  const events = triggers(".github/workflows/quality-gate.yml");

  assert.match(events, /  push:\n    branches:\n      - dev\n/);
  assert.match(events, /  pull_request:\n    branches:\n      - master\n      - dev\n/);
  for (const command of [
    "npm run check:architecture",
    "npm run test:unit",
    "npm run lint",
    "npx tsc --noEmit",
    "npm run build",
    "npm --prefix desktop run build",
  ]) {
    assert.ok(workflow.includes(`run: ${command}`) || workflow.includes(`          ${command}`), command);
  }
  assert.doesNotMatch(workflow, /secrets\.|pull_request_target|contents: write/);
});

test("dev commits receive the complete-history secret scan", () => {
  const workflow = read(".github/workflows/secret-scan.yml");
  assert.match(triggers(".github/workflows/secret-scan.yml"), /  push:\n    branches:\n      - master\n      - dev\n/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /gitleaks\/gitleaks-action@/);
});

test("branch integration does not trigger desktop publication or production smoke", () => {
  const releaseEvents = triggers(".github/workflows/desktop-release.yml");
  assert.match(releaseEvents, /  push:\n    tags:\n      - "desktop-v\*"/);
  assert.doesNotMatch(releaseEvents, /branches:|pull_request:/);
  assert.doesNotMatch(triggers(".github/workflows/e2e-smoke.yml"), /  (push|pull_request):/);
});
