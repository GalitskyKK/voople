import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from '../scripts/migration-manifest.mjs';
import { walletLedgerValidationSql, assertWalletLedgerReadiness } from '../scripts/wallet-ledger-readiness.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/wallet-ledger.json',import.meta.url),'utf8'));
test('wallet ledger release order and verified historical fingerprints',()=>{
 assert.equal(REQUIRED_MIGRATIONS.length,50);
 assert.deepEqual(RELEASE_APPLY_ORDER.slice(0,9),['45-app-schema-migrations.sql','82-core-baseline-compatibility.sql','83-commerce-prerequisite-compatibility.sql','84-commerce-base-compatibility.sql','85-wallet-ledger-compatibility.sql','86-payment-fulfillment-compatibility.sql','87-promo-compatibility.sql','88-group-runtime-rpc-compatibility.sql','38-group-emojis.sql']);
 assert.deepEqual(fixture.tables.map(t=>t.name),['user_wallets','wallet_transactions']);
 assert.deepEqual(fixture.functions.map(f=>[f.name,f.definition_md5_lf]),[['ensure_user_wallet','1004769927d4c702131ceb1af7866ed9'],['adjust_wallet','c9b520b2129940e0bb1211b90a2b3eb6'],['purchase_shop_item_with_coins','d23d824342953c6a5ac6eb1234225ff3']]);
 const source=readFileSync(new URL('../drizzle/85-wallet-ledger-compatibility.sql',import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m=>m[1]),['user_wallets','wallet_transactions']);
 assert.doesNotMatch(source,/payment_intents|promo_codes|subscription_fulfillments|extend_voople_plus_once|claim_promo_redemption/);
});
test("wallet readiness uses the migration contract under an enforced read-only transaction", async () => {
  const validation = walletLedgerValidationSql();
  assert.doesNotMatch(validation,/DO \$create\$|CREATE TABLE|ALTER TABLE/);
  let executed = false;
  await assertWalletLedgerReadiness({begin:async (mode,run) => {
    assert.equal(mode,"read only");
    await run({unsafe:async sql => { assert.equal(sql,validation); executed=true; }});
  }});
  assert.equal(executed,true);
});
