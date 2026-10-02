import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { assertWalletLedgerReadiness } from "../../scripts/wallet-ledger-readiness.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const file = "85-wallet-ledger-compatibility.sql";
const files = ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", "84-commerce-base-compatibility.sql", file];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/wallet-ledger.json", import.meta.url), "utf8"));
const options = { skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback", timeout: 120_000 };

async function disposable(run) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Wallet tests require a loopback disposable PostgreSQL server");
  const name = `voople_wallet_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 5 });
  let sql;
  try {
    await ensureTestRoles(admin);
    await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE template0`);
    url.pathname = `/${name}`;
    sql = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 5,
      connection: { statement_timeout: 15_000, lock_timeout: 5_000 } });
    await sql.unsafe(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;`);
    const apply = name => applyMigration(sql, { file: name, source: sources.get(name), releaseVersion: "wallet-ledger-test" });
    await apply(files[0]); await apply(files[1]); await apply(files[2]); await apply(files[3]);
    await run(sql, apply);
  } finally {
    if (sql) await sql.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end({ timeout: 5 });
  }
}

async function installAttested(sql) {
  for (const t of fixture.tables) {
    await sql.unsafe(`CREATE TABLE public.${t.name} (${[
      ...t.columns.map(c=>`${c[0]} ${c[1]}${c[3]!==null ? ' DEFAULT '+c[3] : ''}${c[2] ? '' : ' NOT NULL'}`),
      ...t.constraints.map(c=>`CONSTRAINT ${c[0]} ${c[1]}`),
    ].join(',')})`);
    for (const i of t.indexes.filter(i=>!i[2])) await sql.unsafe(i[1]);
    await sql.unsafe(`ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY`);
    for(const [role,privilege] of t.grants) await sql.unsafe(`GRANT ${privilege} ON public.${t.name} TO ${role}`);
    if(Number((await sql`select current_setting('server_version_num') as n`)[0].n)>=170000) await sql.unsafe(`GRANT MAINTAIN ON public.${t.name} TO anon,authenticated,service_role`);
    for(const p of t.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON public.${t.name} FOR ${{r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE'}[p.command]} TO PUBLIC${p.using_expression ? ' USING ('+p.using_expression+')' : ''}${p.check_expression ? ' WITH CHECK ('+p.check_expression+')' : ''}`);
  }
  for(const f of fixture.functions) {
    await sql.unsafe(f.definition);
    await sql.unsafe(`REVOKE EXECUTE ON FUNCTION ${f.signature} FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION ${f.signature} TO service_role`);
  }
}

async function seed(sql) {
 await sql.unsafe(`INSERT INTO users(id,username,display_name) VALUES
   ('00000000-0000-0000-0000-000000000001','owner','Owner'),
   ('00000000-0000-0000-0000-000000000002','other','Other');
   INSERT INTO user_wallets(user_id,balance_coins,updated_at) VALUES ('00000000-0000-0000-0000-000000000001',0,'2026-01-01T12:34:56.123456Z');
   INSERT INTO wallet_transactions(user_id,amount,balance_after,kind,reference_type,reference_id,note,created_at,idempotency_key)
   VALUES ('00000000-0000-0000-0000-000000000001',1,0,'earn','fixture','legacy','Preserve','2026-01-01T12:34:56.123456Z','fixture');`);
}
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function snapshot(sql) {
  return {
    functions: await sql`select p.proname,pg_get_functiondef(p.oid) as definition,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname`,
    rows: await Promise.all(fixture.tables.map(t => sql.unsafe(`SELECT row_to_json(t) AS row FROM public.${t.name} t ORDER BY row_to_json(t)::text`))),
    catalogs: await sql`select relname,relacl::text,relreplident,relrowsecurity,relforcerowsecurity from pg_class
      where relnamespace='public'::regnamespace order by relname`,
    policies: await sql`select * from pg_policies where schemaname='public' order by tablename,policyname`,
    constraints: await sql`select conname,pg_get_constraintdef(oid,true) as definition from pg_constraint
      where connamespace='public'::regnamespace order by conname`,
    indexes: await sql`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`,
    triggers: await sql`select tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal order by tgname`,
  };
}



test('fresh wallet creation is exact, hardened, seedless and checksum-verified immutable no-op',options,()=>disposable(async(sql,apply)=>{
 await apply(file); await assertWalletLedgerReadiness(sql);
 for(const t of fixture.tables) assert.equal((await sql.unsafe(`select count(*)::integer as n from ${t.name}`))[0].n,0);
 const before=await snapshot(sql),ledger=await sql`select * from app_schema_migrations order by id`;
 assert.equal((await apply(file)).status,'already-applied');
 assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
 assert.deepEqual(await snapshot(sql),before);
 assert.equal(ledger.find(r=>r.id===file).checksum,migrationChecksum(sources.get(file)));
 await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+'\n-- drift',releaseVersion:'drift'}),/checksum mismatch/);
}));
test('wallet adoption preserves balances/history/bodies/ACLs and compatible extra metadata; readiness read-only',options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql); await seed(sql);
 await sql.unsafe(`ALTER TABLE wallet_transactions ADD COLUMN compatible_extra text DEFAULT 'preserved';
 CREATE INDEX compatible_extra_idx ON wallet_transactions(compatible_extra);
 CREATE FUNCTION wallet_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
 CREATE TRIGGER wallet_extra_trigger BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION wallet_extra_trigger();`);
 const before=await snapshot(sql); await apply(file); assert.deepEqual(await snapshot(sql),before);
 await assertWalletLedgerReadiness(sql); assert.deepEqual(await snapshot(sql),before);
}));
const driftCases=[
 ['timestamp','ALTER TABLE user_wallets ALTER COLUMN updated_at TYPE timestamp'],
 ['transaction timestamp','ALTER TABLE wallet_transactions ALTER COLUMN created_at TYPE timestamp'],
 ['varchar typmod','ALTER TABLE wallet_transactions ALTER COLUMN idempotency_key TYPE varchar(100)'],
 ['collation','ALTER TABLE wallet_transactions ALTER COLUMN note TYPE varchar(200) COLLATE "C"'],
 ['nullability','ALTER TABLE user_wallets ALTER COLUMN balance_coins DROP NOT NULL'],
 ['default','ALTER TABLE user_wallets ALTER COLUMN balance_coins SET DEFAULT 500'],
 ['PK','ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_pkey'],
 ['FK target','ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_user_id_fkey; ALTER TABLE wallet_transactions ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE'],
 ['FK action','ALTER TABLE user_wallets DROP CONSTRAINT user_wallets_user_id_fkey; ALTER TABLE user_wallets ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES users(id)'],
 ['FK validation','ALTER TABLE user_wallets DROP CONSTRAINT user_wallets_user_id_fkey; ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID'],
 ['missing CHECK','ALTER TABLE user_wallets DROP CONSTRAINT user_wallets_balance_coins_check'],
 ['wrong CHECK','ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_balance_after_check; ALTER TABLE wallet_transactions ADD CONSTRAINT wrong_check CHECK(balance_after>0)'],
 ['partial predicate','DROP INDEX wallet_transactions_idempotency_uidx; CREATE UNIQUE INDEX wallet_transactions_idempotency_uidx ON wallet_transactions(user_id,idempotency_key)'],
 ['index direction','DROP INDEX wallet_transactions_user_idx; CREATE INDEX wallet_transactions_user_idx ON wallet_transactions(user_id,created_at)'],
 ['RLS','ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY'],
 ['forced RLS','ALTER TABLE wallet_transactions FORCE ROW LEVEL SECURITY'],
 ['policy','ALTER POLICY user_wallets_select_own ON user_wallets USING(true)'],
 ['extra write policy','CREATE POLICY broad_insert ON wallet_transactions FOR INSERT WITH CHECK(true)'],
 ['grant','REVOKE SELECT ON user_wallets FROM authenticated'],
 ['PUBLIC relation grant','GRANT SELECT ON wallet_transactions TO PUBLIC'],
 ['wrong signature','ALTER FUNCTION ensure_user_wallet(uuid) RENAME TO old_ensure; CREATE FUNCTION ensure_user_wallet(text) RETURNS integer LANGUAGE plpgsql AS \'BEGIN RETURN 0; END\''],
 ['extra overload','CREATE FUNCTION ensure_user_wallet(text) RETURNS integer LANGUAGE plpgsql AS \'BEGIN RETURN 0; END\''],
 ['security definer','ALTER FUNCTION ensure_user_wallet(uuid) SECURITY INVOKER'],
 ['search_path','ALTER FUNCTION ensure_user_wallet(uuid) SET search_path=pg_catalog'],
 ['volatility','ALTER FUNCTION ensure_user_wallet(uuid) STABLE'],
 ['strictness','ALTER FUNCTION ensure_user_wallet(uuid) STRICT'],
 ['return type',"DROP FUNCTION ensure_user_wallet(uuid); CREATE FUNCTION ensure_user_wallet(uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN NULL; END'"],
 ['body','CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS \'BEGIN RETURN 0; END\''],
 ['PUBLIC RPC grant','GRANT EXECUTE ON FUNCTION ensure_user_wallet(uuid) TO PUBLIC'],
 ['anon RPC grant','GRANT EXECUTE ON FUNCTION adjust_wallet(uuid,integer,varchar,varchar,varchar,varchar,varchar) TO anon'],
 ['authenticated RPC grant','GRANT EXECUTE ON FUNCTION purchase_shop_item_with_coins(uuid,varchar) TO authenticated'],
 ['service RPC grant','REVOKE EXECUTE ON FUNCTION ensure_user_wallet(uuid) FROM service_role'],
];
for(const [name,ddl] of driftCases) test(`wallet ${name} fails closed in adoption/readiness; no ledger or mutation`,options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql); await sql.unsafe(ddl); const before=await snapshot(sql);
 await assert.rejects(apply(file),/Wallet ledger incompatible/);
 await assert.rejects(assertWalletLedgerReadiness(sql),/Wallet ledger incompatible/);
 assert.deepEqual(await snapshot(sql),before);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));
for(const f of fixture.functions) test(`missing ${f.name} is created from the verified body without replacing peers`,options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql); await sql.unsafe(`DROP FUNCTION ${f.signature}`); await apply(file); await assertWalletLedgerReadiness(sql);
 assert.equal((await sql`select md5(replace(pg_get_functiondef(to_regprocedure(${f.signature})),chr(13)||chr(10),chr(10))) as hash`)[0].hash,f.definition_md5_lf);
}));
test('wrong preexisting function rolls back every newly created wallet object and ledger',options,()=>disposable(async(sql,apply)=>{
 await sql.unsafe("CREATE FUNCTION ensure_user_wallet(uuid) RETURNS integer LANGUAGE plpgsql AS 'BEGIN RETURN 0; END'");
 await assert.rejects(apply(file),/Wallet ledger incompatible/);
 for(const t of fixture.tables) assert.equal((await sql`select to_regclass(${'public.'+t.name}) as n`)[0].n,null);
 for(const f of fixture.functions.slice(1)) assert.equal((await sql`select to_regprocedure(${f.signature}) as n`)[0].n,null);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,4);
}));
test('zero balances, negative checks, non-null duplicate keys and multiple NULL keys retain deployed semantics',options,()=>disposable(async(sql,apply)=>{
 await apply(file); await seed(sql);
 await assert.rejects(sql`update user_wallets set balance_coins=-1`,{code:'23514'});
 await assert.rejects(sql`update wallet_transactions set balance_after=-1`,{code:'23514'});
 await assert.rejects(sql.unsafe('INSERT INTO wallet_transactions(user_id,amount,balance_after,kind,idempotency_key) SELECT user_id,amount,balance_after,kind,idempotency_key FROM wallet_transactions'),{code:'23505'});
 await sql`insert into wallet_transactions(user_id,amount,balance_after,kind) values (${owner},0,0,'legacy'),(${owner},0,0,'legacy')`;
 assert.equal((await sql`select count(*)::integer as n from wallet_transactions where idempotency_key is null`)[0].n,2);
}));
test('verified RPC behavior: welcome once, adjustment/history/current-balance retry, atomic failures and coin purchase',options,()=>disposable(async(sql,apply)=>{
 await apply(file); await seed(sql);
 assert.equal((await sql`select ensure_user_wallet(${owner}) as n`)[0].n,0);
 assert.equal((await sql`select ensure_user_wallet(${other}) as n`)[0].n,500);
 assert.equal((await sql`select ensure_user_wallet(${other}) as n`)[0].n,500);
 assert.equal((await sql`select count(*)::integer as n from wallet_transactions where user_id=${other}`)[0].n,1);
 const adjust=(amount,key)=>sql`select adjust_wallet(${owner},${amount},'earn','test','id','note',${key}) as n`;
 assert.equal((await adjust(100,'credit'))[0].n,100);
 assert.equal((await adjust(20,'next'))[0].n,120);
 assert.equal((await adjust(999,'credit'))[0].n,120);
 assert.deepEqual((await sql`select amount,balance_after,kind,reference_type,reference_id,note,idempotency_key from wallet_transactions where user_id=${owner} and idempotency_key in ('credit','next') order by idempotency_key`).map(r=>({...r})),[
   {amount:100,balance_after:100,kind:'earn',reference_type:'test',reference_id:'id',note:'note',idempotency_key:'credit'},
   {amount:20,balance_after:120,kind:'earn',reference_type:'test',reference_id:'id',note:'note',idempotency_key:'next'},
 ]);
 const before=await snapshot(sql);
 await assert.rejects(adjust(-121,'insufficient'),/Insufficient balance/);
 await assert.rejects(adjust(0,'zero'),/Amount must not be zero/);
 await assert.rejects(adjust(1,''),/Idempotency key is required/);
 await assert.rejects(adjust(1,null),/Idempotency key is required/);
 await assert.rejects(adjust(null,'null-amount'),{code:'23502'});
 assert.deepEqual(await snapshot(sql),before);
 await sql`insert into shop_items(id,type,name,price_rub,price_coins) values ('paid','frame','Paid',0,30)`;
 assert.equal((await sql`select purchase_shop_item_with_coins(${owner},'paid') as n`)[0].n,90);
 assert.equal((await sql`select acquired_via::text as via from user_inventory where user_id=${owner} and item_id='paid'`)[0].via,'purchase');
 await sql`insert into shop_items(id,type,name,price_rub,price_coins,is_free) values ('expensive','frame','Expensive',0,100,false),('free','frame','Free',0,10,true),('unavailable','frame','Unavailable',0,0,false)`;
 const purchased=await snapshot(sql);
 await assert.rejects(sql`select purchase_shop_item_with_coins(${owner},'paid')`,/Item already owned/);
 await assert.rejects(sql`select purchase_shop_item_with_coins(${owner},'missing')`,/Item not found/);
 await assert.rejects(sql`select purchase_shop_item_with_coins(${owner},'expensive')`,/Insufficient balance/);
 await assert.rejects(sql`select purchase_shop_item_with_coins(${owner},'free')`,/Item is free/);
 await assert.rejects(sql`select purchase_shop_item_with_coins(${owner},'unavailable')`,/Item is not available for coins/);
 assert.equal((await sql`select count(*)::integer as n from user_inventory where user_id=${owner}`)[0].n,1);
 assert.deepEqual(await snapshot(sql),purchased);
}));
test('browser RLS self-only and denied wallet mutations/RPCs; service_role may execute all three',options,()=>disposable(async(sql,apply)=>{
 await apply(file); await seed(sql);
 const calls=[`select ensure_user_wallet('${owner}')`,`select adjust_wallet('${owner}',1,'earn','test','id','note','key')`,`select purchase_shop_item_with_coins('${owner}','item')`];
 for(const role of ['anon','authenticated']) for(const call of calls) await assert.rejects(sql.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`); await tx.unsafe(call);}),{code:'42501'});
 for(const [role,id,n] of [['anon','',0],['authenticated',owner,1],['authenticated',other,0]]) await sql.begin(async tx=>{
   await tx.unsafe(`SET LOCAL ROLE ${role}`); await tx`select set_config('request.jwt.claim.sub',${id},true)`;
   for(const t of fixture.tables) assert.equal((await tx.unsafe(`select count(*)::integer as n from ${t.name}`))[0].n,n);
   assert.equal((await tx`update user_wallets set balance_coins=999 returning user_id`).length,0);
 });
 await sql`insert into shop_items(id,type,name,price_rub,price_coins) values ('service','frame','Service',0,1)`;
 await sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');
   assert.equal((await tx`select ensure_user_wallet(${other}) as n`)[0].n,500);
   assert.equal((await tx`select adjust_wallet(${other},2,'earn','test','id','note','service') as n`)[0].n,502);
   assert.equal((await tx`select purchase_shop_item_with_coins(${other},'service') as n`)[0].n,501);
 });
}));
