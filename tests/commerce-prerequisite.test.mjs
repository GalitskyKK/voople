import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RELEASE_APPLY_ORDER, REQUIRED_MIGRATIONS } from "../scripts/migration-manifest.mjs";
import { commercePrerequisiteValidationSql, assertCommercePrerequisiteReadiness } from "../scripts/commerce-prerequisite-readiness.mjs";

const file = "83-commerce-prerequisite-compatibility.sql";
const source = readFileSync(new URL(`../drizzle/${file}`,import.meta.url),"utf8");
test("commerce prerequisite is allowlisted once and precedes dependent 38/43/51", () => {
  assert.equal(REQUIRED_MIGRATIONS.filter(id => id === file).length,1);
  assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,7),["45-app-schema-migrations.sql","82-core-baseline-compatibility.sql",file,"84-commerce-base-compatibility.sql","85-wallet-ledger-compatibility.sql","86-payment-fulfillment-compatibility.sql","38-group-emojis.sql"]);
  assert.doesNotMatch(source,/\bDROP\b|\bINSERT\s+INTO\b|\bUPDATE\s+public\./i);
  assert.deepEqual([...source.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m => m[1]),["subscriptions","group_boosts","group_customization"]);
  assert.doesNotMatch(source,/CREATE (?:OR REPLACE )?FUNCTION|personal_plan_grants|group_charges|shop_items|user_wallets|payment_intents/);
});
test("commerce readiness uses the migration contract under an enforced read-only transaction", async () => {
  const validation = commercePrerequisiteValidationSql();
  assert.doesNotMatch(validation,/DO \$create\$|EXECUTE|CREATE TABLE|ALTER TABLE/);
  let executed = false;
  await assertCommercePrerequisiteReadiness({begin:async (mode,run) => {
    assert.equal(mode,"read only");
    await run({unsafe:async sql => { assert.equal(sql,validation); executed=true; }});
  }});
  assert.equal(executed,true);
});
test("commerce fixture includes only schema evidence and exact timestamp contracts", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/commerce-prerequisite.json",import.meta.url),"utf8"));
  assert.deepEqual(fixture.labels,["plus","pro"]);
  assert.doesNotMatch(JSON.stringify(fixture),/row_count|null_counts|owner"|type_oid|column_positions/);
  const column = (table,name) => fixture.tables.find(t => t.name === table).columns.find(c => c[0] === name);
  assert.equal(column("subscriptions","expires_at")[1],"timestamp without time zone");
  assert.equal(column("group_boosts","assigned_at")[1],"timestamp with time zone");
});
