import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

import { RELEASE_APPLY_ORDER, REQUIRED_MIGRATIONS } from "../scripts/migration-manifest.mjs";

test("migration 78 is required and applied after 77", () => {
  const previous = "77-friendships.sql";
  const migration = "78-core-direct-call-foundation.sql";

  assert.ok(REQUIRED_MIGRATIONS.includes(migration));
  assert.ok(RELEASE_APPLY_ORDER.includes(migration));
  assert.equal(REQUIRED_MIGRATIONS.indexOf(migration), REQUIRED_MIGRATIONS.indexOf(previous) + 1);
  assert.equal(RELEASE_APPLY_ORDER.indexOf(migration), RELEASE_APPLY_ORDER.indexOf(previous) + 1);
});

test("every numbered SQL migration is required and in release apply order", async () => {
  const files = await readdir(new URL("../drizzle/", import.meta.url));
  const numberedMigrations = files.filter((file) => /^\d+-.*\.sql$/.test(file)).sort();

  assert.deepEqual([...REQUIRED_MIGRATIONS].sort(), numberedMigrations);
  assert.deepEqual([...RELEASE_APPLY_ORDER].sort(), numberedMigrations);
});
