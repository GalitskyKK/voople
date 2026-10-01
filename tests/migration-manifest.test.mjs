import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

test("every tracked numbered SQL migration is required and in release apply order", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = execFileSync("git", ["ls-files", "-z", "--", "drizzle/*.sql"], { cwd: root, encoding: "utf8" }).split("\0");
  const numberedMigrations = files.filter((file) => /^drizzle\/\d+-.*\.sql$/.test(file)).map((file) => file.slice(8)).sort();

  assert.deepEqual([...REQUIRED_MIGRATIONS].sort(), numberedMigrations);
  assert.deepEqual([...RELEASE_APPLY_ORDER].sort(), numberedMigrations);
  assert.equal(new Set(REQUIRED_MIGRATIONS).size, REQUIRED_MIGRATIONS.length);
  assert.equal(RELEASE_APPLY_ORDER[0], "45-app-schema-migrations.sql");
});

test("local historical/reset/seed files never enter the release allowlist", async () => {
  const directory = await mkdtemp(join(tmpdir(), "voople-local-sql-"));
  const localFiles = ["00-reset-partial-migration.sql", "12-shop-currency.sql", "25-commerce-hardening.sql", "shop-catalog-upsert.sql"];
  try {
    for (const file of localFiles) await writeFile(join(directory, file), "DO $$ BEGIN RAISE EXCEPTION 'never replay'; END $$;");
    for (const file of await readdir(directory)) {
      assert.equal(REQUIRED_MIGRATIONS.includes(file), false);
      assert.equal(RELEASE_APPLY_ORDER.includes(file), false);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
