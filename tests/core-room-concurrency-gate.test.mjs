import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core Room concurrency gate cannot target production implicitly", async () => {
  const [integration, packageJson] = await Promise.all([
    readFile(new URL("./integration/core-room-concurrency.integration.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(integration, /VOOPLE_TEST_DATABASE_URL/);
  assert.match(integration, /VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true"/);
  assert.match(integration, /new Set\(\["127\.0\.0\.1", "localhost", "::1"\]\)/);
  assert.match(integration, /pathname\.toLowerCase\(\)\.includes\("test"\)/);
  assert.match(integration, /voople_core_room_test_/);
  assert.match(integration, /DROP SCHEMA IF EXISTS/);
  assert.doesNotMatch(integration, /process\.env\.DATABASE_URL/);
  assert.match(JSON.parse(packageJson).scripts["test:db:core-room"], /core-room-concurrency\.integration\.mjs/);
});
