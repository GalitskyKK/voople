import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from "../scripts/migration-manifest.mjs";

const migration = "80-personal-plan-grant-foundation.sql";
const source = readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
test("personal grant migration is tracked, registered and checked for readiness", () => {
  for (const migrations of [REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER]) {
    assert.equal(migrations.indexOf(migration), migrations.indexOf("79-group-grade-foundation.sql") + 1);
    assert.equal(migrations.filter((name) => name === migration).length, 1);
  }
  assert.match(readFileSync(new URL("../.gitignore", import.meta.url), "utf8"), /!\/drizzle\/80-personal-plan-grant-foundation\.sql/);
  assert.match(readFileSync(new URL("../drizzle.config.ts", import.meta.url), "utf8"), /personal-plan-schema\.ts/);
  const readiness = readFileSync(new URL("../scripts/check-migration-readiness.mjs", import.meta.url), "utf8");
  assert.match(readiness, /to_regclass\('public\.personal_plan_grants'\)/);
  assert.match(readiness, /to_regprocedure\('public\.load_active_personal_plan_grants\(uuid,timestamptz\)'\)/);
});
test("schema stores facts with strict validity and no policy or legacy coupling", () => {
  assert.match(source, /CREATE TABLE public\.personal_plan_grants/);
  assert.match(source, /REFERENCES public\.users\(id\) ON DELETE CASCADE/);
  assert.match(source, /plan_kind IN \('style', 'full'\)/);
  assert.match(source, /source_reference varchar\(200\) NOT NULL UNIQUE/);
  assert.match(source, /length\(btrim\(source_reference\)\) > 0 AND source_reference = btrim\(source_reference\)/);
  assert.match(source, /isfinite\(valid_from\) AND isfinite\(valid_until\) AND valid_until > valid_from/);
  assert.match(source, /valid_from <= p_evaluated_at AND p_evaluated_at < valid_until/);
  assert.match(source, /user_id = p_user_id AND revoked_at IS NULL/);
  assert.doesNotMatch(source, /CREATE UNIQUE INDEX|subscriptions|group_charges|boost|price|provider.*enum|has_plus|effective_plan|updated_at|INSERT INTO/i);
});
test("browser privileges are revoked and trusted snapshot search path is explicit", () => {
  assert.match(source, /ALTER TABLE public\.personal_plan_grants ENABLE ROW LEVEL SECURITY/);
  assert.match(source, /REVOKE ALL ON TABLE public\.personal_plan_grants FROM PUBLIC, anon, authenticated/);
  assert.match(source, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.personal_plan_grants TO service_role/);
  assert.match(source, /STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp/);
  assert.match(source, /REVOKE ALL ON FUNCTION public\.load_active_personal_plan_grants\(uuid, timestamptz\) FROM PUBLIC, anon, authenticated/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.load_active_personal_plan_grants\(uuid, timestamptz\) TO service_role/);
  assert.doesNotMatch(source, /CREATE.*POLICY/);
  const functionBody = source.split("AS $$")[1].split("$$;")[0];
  assert.doesNotMatch(functionBody, /source_reference|created_at/);
});
