import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RELEASE_APPLY_ORDER, REQUIRED_MIGRATIONS } from "../scripts/migration-manifest.mjs";
import { coreBaselineValidationSql, assertCoreBaselineReadiness } from "../scripts/core-baseline-readiness.mjs";

const file = "82-core-baseline-compatibility.sql";
const source = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
test("core baseline is release-authoritative after ledger and before feature migrations", () => {
  assert.equal(REQUIRED_MIGRATIONS.filter(id => id === file).length,1);
  assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,9),["45-app-schema-migrations.sql",file,"83-commerce-prerequisite-compatibility.sql","84-commerce-base-compatibility.sql","85-wallet-ledger-compatibility.sql","86-payment-fulfillment-compatibility.sql", "87-promo-compatibility.sql", "88-group-runtime-rpc-compatibility.sql","38-group-emojis.sql"]);
  assert.doesNotMatch(source,/\bDROP\s+(TABLE|TYPE|FUNCTION|POLICY|CONSTRAINT|INDEX)\b/i);
  assert.doesNotMatch(source,/\bCREATE\s+(SCHEMA\s+auth|ROLE|TABLE\s+(?:public\.)?(subscriptions|group_boosts|group_customization|payment_intents|group_charges|personal_plan_grants))\b/i);
});
test("readiness reuses the current adoption contract under a read-only transaction", async () => {
  const validation = coreBaselineValidationSql();
  assert.match(validation,/require_current boolean := true/);
  assert.doesNotMatch(validation,/DO \$create\$|set_config|ALTER TABLE|CREATE TABLE|CREATE TYPE/);
  let executed = false;
  await assertCoreBaselineReadiness({begin: async (mode,run) => {
    assert.equal(mode,"read only");
    await run({unsafe: async sql => {assert.equal(sql,validation);executed=true;}});
  }});
  assert.equal(executed,true);
});
test("PostgreSQL proof has no operational credential fallback and uses unchanged sources", () => {
  const integration = readFileSync(new URL("./integration/core-baseline.integration.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(integration,/process\.env\.(DATABASE_URL|DIRECT_URL)|loadEnv|check_function_bodies\s*=|replaceAll\("public/);
  assert.match(integration,/process\.env\.VOOPLE_TEST_DATABASE_URL/);
  assert.match(integration,/applyMigration\(sql/);
});
