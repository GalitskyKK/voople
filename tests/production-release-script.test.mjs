import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const bash = process.platform === "win32" && existsSync("C:/Program Files/Git/bin/bash.exe")
  ? "C:/Program Files/Git/bin/bash.exe"
  : "bash";
const script = new URL("../deploy/production/bin/deploy-release", import.meta.url);
const oldSha = "a".repeat(40);
const newSha = "b".repeat(40);
const image = (sha) => `ghcr.io/example/voople/web:${sha}`;

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "voople-deploy-"));
  try {
    await mkdir(join(dir, "bin"));
    await copyFile(script, join(dir, "deploy-release"));
    for (const name of [".env", "app.env", "cron.env"]) {
      await writeFile(join(dir, name), "fixture=1\n");
    }
    await writeFile(join(dir, "bin", "docker"), `#!/usr/bin/env bash
if [[ "$1 $2" == "compose pull" ]]; then
  if [[ "$FAIL_NEW_PULL" == 1 && "$VOOPLE_IMAGE" == *"$NEW_SHA" ]]; then exit 1; fi
  exit 0
fi
if [[ "$1 $2" == "compose up" ]]; then
  printf '%s\\n' "$VOOPLE_IMAGE" > "$DEPLOY_DIR/current-image"
  if [[ "$FAIL_NEW_UP" == 1 && "$VOOPLE_IMAGE" == *"$NEW_SHA" ]]; then exit 1; fi
  exit 0
fi
exit 2
`);
    await writeFile(join(dir, "bin", "curl"), `#!/usr/bin/env bash
if [[ "$FAIL_NEW_HEALTH" == 1 ]] && [[ "$(cat "$DEPLOY_DIR/current-image")" == *"$NEW_SHA" ]]; then
  exit 22
fi
exit 0
`);
    await writeFile(join(dir, "bin", "sleep"), "#!/usr/bin/env bash\nexit 0\n");
    const { chmod } = await import("node:fs/promises");
    for (const name of ["docker", "curl", "sleep"]) await chmod(join(dir, "bin", name), 0o755);
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function deploy(dir, sha, failure = "") {
  return spawnSync(bash, ["-c", 'PATH="$PWD/bin:$PATH" DEPLOY_DIR="$PWD" bash ./deploy-release "$1" "$2"', "_", sha, image(sha)], {
    cwd: dir,
    env: {
      ...process.env,
      FAIL_NEW_HEALTH: failure === "health" ? "1" : "0",
      FAIL_NEW_PULL: failure === "pull" ? "1" : "0",
      FAIL_NEW_UP: failure === "up" ? "1" : "0",
      NEW_SHA: newSha,
    },
    encoding: "utf8",
  });
}

test("host release state advances only after local health and rolls back once", async () => {
  await fixture(async (dir) => {
    const first = deploy(dir, oldSha);
    assert.equal(first.status, 0, first.stderr);
    assert.equal((await readFile(join(dir, ".deployed-sha"), "utf8")).trim(), oldSha);
    assert.equal(existsSync(join(dir, ".previous-sha")), false);

    const failed = deploy(dir, newSha, "health");
    assert.notEqual(failed.status, 0);
    assert.match(failed.stdout, /DEPLOY_STATUS rollback=success/);
    assert.equal((await readFile(join(dir, ".deployed-sha"), "utf8")).trim(), oldSha);
    assert.equal((await readFile(join(dir, "current-image"), "utf8")).trim(), image(oldSha));

    const success = deploy(dir, newSha);
    assert.equal(success.status, 0, success.stderr);
    assert.equal((await readFile(join(dir, ".deployed-sha"), "utf8")).trim(), newSha);
    assert.equal((await readFile(join(dir, ".previous-sha"), "utf8")).trim(), oldSha);
  });
});

test("first unhealthy release fails without inventing a rollback SHA", async () => {
  await fixture(async (dir) => {
    const failed = deploy(dir, newSha, "health");
    assert.notEqual(failed.status, 0);
    assert.match(failed.stdout, /DEPLOY_STATUS rollback=not-available/);
    assert.equal(existsSync(join(dir, ".deployed-sha")), false);
    assert.equal(existsSync(join(dir, ".previous-sha")), false);
  });
});

test("pull failure leaves the old release untouched; startup failure rolls back", async () => {
  await fixture(async (dir) => {
    assert.equal(deploy(dir, oldSha).status, 0);
    const pull = deploy(dir, newSha, "pull");
    assert.notEqual(pull.status, 0);
    assert.doesNotMatch(pull.stdout, /DEPLOY_STATUS rollback=/);
    assert.equal((await readFile(join(dir, ".deployed-sha"), "utf8")).trim(), oldSha);
    assert.equal((await readFile(join(dir, "current-image"), "utf8")).trim(), image(oldSha));

    const up = deploy(dir, newSha, "up");
    assert.notEqual(up.status, 0);
    assert.match(up.stdout, /DEPLOY_STATUS rollback=success/);
    assert.equal((await readFile(join(dir, ".deployed-sha"), "utf8")).trim(), oldSha);
    assert.equal((await readFile(join(dir, "current-image"), "utf8")).trim(), image(oldSha));
  });
});
