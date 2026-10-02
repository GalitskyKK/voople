import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from '../scripts/migration-manifest.mjs';
import { commerceBaseValidationSql, assertCommerceBaseReadiness } from '../scripts/commerce-base-readiness.mjs';
const file='84-commerce-base-compatibility.sql';
const source=readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8');
test('commerce base has a single dependency-ordered release entry and exactly scoped DDL',()=>{
  assert.equal(REQUIRED_MIGRATIONS.length,51);
  assert.equal(REQUIRED_MIGRATIONS.filter(id=>id===file).length,1);
  assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,9),['45-app-schema-migrations.sql','82-core-baseline-compatibility.sql','83-commerce-prerequisite-compatibility.sql',file,'85-wallet-ledger-compatibility.sql','86-payment-fulfillment-compatibility.sql','87-promo-compatibility.sql','88-group-runtime-rpc-compatibility.sql','38-group-emojis.sql']);
  assert.deepEqual([...source.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m=>m[1]),['shop_items','user_inventory','profile_customization']);
  assert.doesNotMatch(source,/\bDROP\b|\bINSERT\s+INTO\b|CREATE (?:OR REPLACE )?FUNCTION|user_wallets|payment_intents|promo_codes/);
});
test("commerce readiness uses the migration contract under an enforced read-only transaction", async () => {
  const validation = commerceBaseValidationSql();
  assert.doesNotMatch(validation,/DO \$create\$|EXECUTE|CREATE TABLE|ALTER TABLE/);
  let executed = false;
  await assertCommerceBaseReadiness({begin:async (mode,run) => {
    assert.equal(mode,"read only");
    await run({unsafe:async sql => { assert.equal(sql,validation); executed=true; }});
  }});
  assert.equal(executed,true);
});

test('commerce base fixture records exact ordered enum and supplemental replica identity evidence',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/commerce-base.json',import.meta.url),'utf8'));
 assert.deepEqual(fixture.enums,[['item_type',['effect','ring','banner','nameplate','badge','reaction_pack','decoration','feed_card','app_theme','profile_background','frame']],['acquired_via',['purchase','earned','gifted','seasonal_reward','free_claim']],['avatar_type',['constructor','photo']],['banner_type',['color','pattern','animated']]]);
 assert.equal(fixture.tables.length,3);
 for(const t of fixture.tables) assert.equal(t.replica,'d');
 assert.match(fixture.replicaEvidenceLfSha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(fixture),/row_count|null_counts|connection|password/);
});
