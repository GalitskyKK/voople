import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from '../scripts/migration-manifest.mjs';
import { paymentFulfillmentValidationSql, assertPaymentFulfillmentReadiness } from '../scripts/payment-fulfillment-readiness.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/payment-fulfillment.json',import.meta.url),'utf8'));
test('payment foundation release order, exact scope and hash-proven fulfillment definition',()=>{
 assert.equal(REQUIRED_MIGRATIONS.length,47);
 assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,9),['45-app-schema-migrations.sql','82-core-baseline-compatibility.sql','83-commerce-prerequisite-compatibility.sql','84-commerce-base-compatibility.sql','85-wallet-ledger-compatibility.sql','86-payment-fulfillment-compatibility.sql','87-promo-compatibility.sql','88-group-runtime-rpc-compatibility.sql','38-group-emojis.sql']);
 assert.deepEqual(fixture.tables.map(t=>t.name),['payment_intents','subscription_fulfillments']);
 assert.deepEqual(fixture.functions.map(f=>[f.name,f.definition_md5_lf]),[['extend_voople_plus_once','ef7d9439bb76b3837aa549bae16d8c62']]);
 const source=readFileSync(new URL('../drizzle/86-payment-fulfillment-compatibility.sql',import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m=>m[1]),['payment_intents','subscription_fulfillments']);
 assert.doesNotMatch(source,/promo_codes|promo_redemptions|claim_promo_redemption|ensure_user_wallet|adjust_wallet/);
});
test("payment readiness uses the migration contract under an enforced read-only transaction", async () => {
  const validation = paymentFulfillmentValidationSql();
  assert.doesNotMatch(validation,/DO \$create\$|CREATE TABLE|ALTER TABLE/);
  let executed = false;
  await assertPaymentFulfillmentReadiness({begin:async (mode,run) => {
    assert.equal(mode,"read only");
    await run({unsafe:async sql => { assert.equal(sql,validation); executed=true; }});
  }});
  assert.equal(executed,true);
});
