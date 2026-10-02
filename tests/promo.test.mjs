import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from '../scripts/migration-manifest.mjs';
import { promoValidationSql, assertPromoReadiness } from '../scripts/promo-readiness.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/promo.json',import.meta.url),'utf8'));
test('promo foundation release order, exact scope and proven claim definition',()=>{
 assert.equal(REQUIRED_MIGRATIONS.length,48);
 assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,9),['45-app-schema-migrations.sql','82-core-baseline-compatibility.sql','83-commerce-prerequisite-compatibility.sql','84-commerce-base-compatibility.sql','85-wallet-ledger-compatibility.sql','86-payment-fulfillment-compatibility.sql','87-promo-compatibility.sql','88-group-runtime-rpc-compatibility.sql','38-group-emojis.sql']);
 assert.deepEqual(fixture.tables.map(t=>t.name),['promo_codes','promo_redemptions']);
 assert.deepEqual(fixture.functions.map(f=>[f.name,f.definition_md5_lf]),[['claim_promo_redemption','cda399bc55d01e4ed51b653a15fb52ff']]);
 const source=readFileSync(new URL('../drizzle/87-promo-compatibility.sql',import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m=>m[1]),['promo_codes','promo_redemptions']);
 assert.doesNotMatch(source,/adjust_wallet|extend_voople_plus_once|INSERT INTO public\.user_inventory/);
});
test('promo readiness executes only the catalog contract under READ ONLY',async()=>{
 const validation=promoValidationSql();assert.doesNotMatch(validation,/DO \$create\$|CREATE TABLE|ALTER TABLE/);
 let executed=false;await assertPromoReadiness({begin:async(mode,run)=>{assert.equal(mode,'read only');await run({unsafe:async sql=>{assert.equal(sql,validation);executed=true;}});}});assert.equal(executed,true);
});
