import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from "../scripts/migration-manifest.mjs";

test("independent Grade migration is registered after the current integration base", () => {
  for (const migrations of [REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER]) {
    assert.equal(migrations.indexOf("79-group-grade-foundation.sql"), migrations.indexOf("78-core-direct-call-foundation.sql") + 1);
  }
  const sql = readFileSync(new URL("../drizzle/79-group-grade-foundation.sql", import.meta.url), "utf8");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.group_charges FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.load_active_group_charges\(uuid, timestamptz\) FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql, /group_boosts|INSERT INTO|UPDATE public\.subscriptions|CREATE.*POLICY/);
});
