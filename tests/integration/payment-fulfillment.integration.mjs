import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { assertPaymentFulfillmentReadiness } from "../../scripts/payment-fulfillment-readiness.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const file = "86-payment-fulfillment-compatibility.sql";
const files = ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", "84-commerce-base-compatibility.sql", "85-wallet-ledger-compatibility.sql", file];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/payment-fulfillment.json", import.meta.url), "utf8"));
const options = { skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback", timeout: 120_000 };

async function disposable(run) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Payment tests require a loopback disposable PostgreSQL server");
  const name = `voople_payment_test_${crypto.randomUUID().replaceAll("-", "")}`;
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
    const apply = name => applyMigration(sql, { file: name, source: sources.get(name), releaseVersion: "payment-fulfillment-test" });
    await apply(files[0]); await apply(files[1]); await apply(files[2]); await apply(files[3]); await apply(files[4]);
    await run(sql, apply, url.toString());
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


const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function users(sql) {
 await sql`insert into users(id,username,display_name) values (${owner},'owner','Owner'),(${other},'other','Other')`;
}
async function seed(sql) {
 await users(sql);
 await sql`insert into payment_intents(user_id,kind,amount_rub,status,provider,external_id,metadata,created_at,updated_at) values
 (${owner},'legacy_kind',1,'legacy_status','legacy','payment-fixture','{"nested":{"array":[1,null,"fixture"]}}','2026-01-01T12:34:56.123456Z','2026-01-01T12:34:56.123456Z')`;
 await sql`insert into subscription_fulfillments(external_id,user_id,provider,period_days,created_at) values ('fulfillment-fixture',${owner},'legacy',30,'2026-01-01T12:34:56.123456Z')`;
 await sql`insert into subscriptions(user_id,tier,started_at,expires_at,payment_provider,external_id) values (${owner},'pro','2026-01-01','2099-01-01','legacy','preserved')`;
}
async function snapshot(sql) {
  return {
    subscriptions: await sql`select row_to_json(t) as row from subscriptions t order by user_id`,
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




test('fresh payment/fulfillment creates exact seedless contract with hardened RPC and immutable checksum no-op',options,()=>disposable(async(sql,apply)=>{
 await apply(file); await assertPaymentFulfillmentReadiness(sql);
 for(const name of ['payment_intents','subscription_fulfillments','subscriptions']) assert.equal((await sql.unsafe(`select count(*)::integer as n from ${name}`))[0].n,0);
 const before=await snapshot(sql),ledger=await sql`select * from app_schema_migrations order by id`;
 assert.equal((await apply(file)).status,'already-applied');
 assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
 assert.deepEqual(await snapshot(sql),before);
 assert.equal(ledger.find(r=>r.id===file).checksum,migrationChecksum(sources.get(file)));
 await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+'\n-- drift',releaseVersion:'drift'}),/checksum mismatch/);
}));
test('existing payment metadata/statuses, fulfillment/subscription rows, function body/ACL and extra metadata survive adoption/readiness',options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql); await seed(sql);
 await sql.unsafe(`ALTER TABLE payment_intents ADD COLUMN compatible_extra text DEFAULT 'preserved';
 CREATE INDEX compatible_extra_idx ON payment_intents(compatible_extra);
 CREATE FUNCTION payment_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
 CREATE TRIGGER payment_extra_trigger BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION payment_extra_trigger();`);
 const before=await snapshot(sql);await apply(file);assert.deepEqual(await snapshot(sql),before);
 await assertPaymentFulfillmentReadiness(sql);assert.deepEqual(await snapshot(sql),before);
}));
const signature='extend_voople_plus_once(uuid,varchar,integer,varchar)';
const driftCases=[
 ['payment timestamp','ALTER TABLE payment_intents ALTER COLUMN updated_at TYPE timestamp'],
 ['fulfillment timestamp','ALTER TABLE subscription_fulfillments ALTER COLUMN created_at TYPE timestamp'],
 ['varchar length','ALTER TABLE payment_intents ALTER COLUMN external_id TYPE varchar(100)'],
 ['collation','ALTER TABLE payment_intents ALTER COLUMN kind TYPE varchar(30) COLLATE "C"'],
 ['metadata type','ALTER TABLE payment_intents ALTER COLUMN metadata TYPE json'],
 ['metadata default',`ALTER TABLE payment_intents ALTER COLUMN metadata SET DEFAULT '{"drift":true}'::jsonb`],
 ['nullability','ALTER TABLE payment_intents ALTER COLUMN metadata DROP NOT NULL'],
 ['status default',"ALTER TABLE payment_intents ALTER COLUMN status SET DEFAULT 'succeeded'"],
 ['payment PK','ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_pkey'],
 ['fulfillment global PK','ALTER TABLE subscription_fulfillments DROP CONSTRAINT subscription_fulfillments_pkey; ALTER TABLE subscription_fulfillments ADD PRIMARY KEY(provider,external_id)'],
 ['FK target','ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_user_id_fkey; ALTER TABLE payment_intents ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE'],
 ['FK action','ALTER TABLE subscription_fulfillments DROP CONSTRAINT subscription_fulfillments_user_id_fkey; ALTER TABLE subscription_fulfillments ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES users(id)'],
 ['FK validation','ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_user_id_fkey; ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID'],
 ['payment CHECK','ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_amount_rub_check'],
 ['period CHECK','ALTER TABLE subscription_fulfillments DROP CONSTRAINT subscription_fulfillments_period_days_check; ALTER TABLE subscription_fulfillments ADD CONSTRAINT wrong_check CHECK(period_days>0)'],
 ['partial predicate','DROP INDEX payment_intents_external_uidx; CREATE UNIQUE INDEX payment_intents_external_uidx ON payment_intents(provider,external_id)'],
 ['descending index','DROP INDEX payment_intents_user_idx; CREATE INDEX payment_intents_user_idx ON payment_intents(user_id,created_at)'],
 ['RLS','ALTER TABLE payment_intents DISABLE ROW LEVEL SECURITY'],
 ['forced RLS','ALTER TABLE subscription_fulfillments FORCE ROW LEVEL SECURITY'],
 ['own policy','ALTER POLICY payment_intents_select_own ON payment_intents USING(true)'],
 ['fulfillment browser policy','CREATE POLICY broad_read ON subscription_fulfillments FOR SELECT TO authenticated USING(true)'],
 ['relation grant','REVOKE SELECT ON payment_intents FROM authenticated'],
 ['PUBLIC relation grant','GRANT SELECT ON subscription_fulfillments TO PUBLIC'],
 ['signature',`ALTER FUNCTION ${signature} RENAME TO old_extend; CREATE FUNCTION extend_voople_plus_once(text) RETURNS boolean LANGUAGE plpgsql AS 'BEGIN RETURN true; END'`],
 ['overload',"CREATE FUNCTION extend_voople_plus_once(text) RETURNS boolean LANGUAGE plpgsql AS 'BEGIN RETURN true; END'"],
 ['result',`DROP FUNCTION ${signature}; CREATE FUNCTION extend_voople_plus_once(uuid,varchar,integer,varchar) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN 0; END'`],
 ['security',`ALTER FUNCTION ${signature} SECURITY INVOKER`],
 ['search_path',`ALTER FUNCTION ${signature} SET search_path=pg_catalog`],
 ['volatility',`ALTER FUNCTION ${signature} STABLE`],
 ['strictness',`ALTER FUNCTION ${signature} STRICT`],
 ['parallel',`ALTER FUNCTION ${signature} PARALLEL SAFE`],
 ['defaults',fixture.functions[0].definition.replace('p_provider character varying)','p_provider character varying DEFAULT NULL::character varying)')],
 ['body',"CREATE OR REPLACE FUNCTION extend_voople_plus_once(p_user_id uuid,p_external_id varchar,p_period_days integer,p_provider varchar) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN true; END'"],
 ['PUBLIC EXECUTE',`GRANT EXECUTE ON FUNCTION ${signature} TO PUBLIC`],
 ['anon EXECUTE',`GRANT EXECUTE ON FUNCTION ${signature} TO anon`],
 ['authenticated EXECUTE',`GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`],
 ['service EXECUTE',`REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role`],
];
for(const [name,ddl] of driftCases)test(`payment/fulfillment ${name} rejects adoption/readiness without mutation or ledger`,options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql);await sql.unsafe(ddl);const before=await snapshot(sql);
 await assert.rejects(apply(file),/Payment fulfillment incompatible/);
 await assert.rejects(assertPaymentFulfillmentReadiness(sql),/Payment fulfillment incompatible/);
 assert.deepEqual(await snapshot(sql),before);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));
test('missing fulfillment RPC is created from the proven body',options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql);await sql.unsafe(`DROP FUNCTION ${signature}`);await apply(file);await assertPaymentFulfillmentReadiness(sql);
 assert.equal((await sql`select md5(replace(pg_get_functiondef(to_regprocedure(${fixture.functions[0].signature})),chr(13)||chr(10),chr(10))) as hash`)[0].hash,'ef7d9439bb76b3837aa549bae16d8c62');
}));
test('wrong existing RPC rolls back all new tables and ledger',options,()=>disposable(async(sql,apply)=>{
 await sql.unsafe("CREATE FUNCTION extend_voople_plus_once(uuid,varchar,integer,varchar) RETURNS boolean LANGUAGE plpgsql AS 'BEGIN RETURN false; END'");
 await assert.rejects(apply(file),/Payment fulfillment incompatible/);
 for(const t of fixture.tables)assert.equal((await sql`select to_regclass(${'public.'+t.name}) as n`)[0].n,null);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,5);
}));
test('amount checks, partial provider/external uniqueness, NULL multiplicity, global fulfillment PK and period limits',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await users(sql);
 for(const amount of [0,-1])await assert.rejects(sql`insert into payment_intents(user_id,kind,amount_rub) values (${owner},'legacy',${amount})`,{code:'23514'});
 await sql`insert into payment_intents(user_id,kind,amount_rub,provider,external_id) values
 (${owner},'legacy',1,'one','same'),(${owner},'legacy',1,'two','same'),(${owner},'legacy',1,'one',null),(${owner},'legacy',1,'one',null)`;
 await assert.rejects(sql`insert into payment_intents(user_id,kind,amount_rub,provider,external_id) values (${owner},'legacy',1,'one','same')`,{code:'23505'});
 for(const days of [0,-1,3651])await assert.rejects(sql`insert into subscription_fulfillments(external_id,user_id,provider,period_days) values ('invalid',${owner},'one',${days})`,{code:'23514'});
 await sql`insert into subscription_fulfillments(external_id,user_id,provider,period_days) values ('global',${owner},'one',3650)`;
 await assert.rejects(sql`insert into subscription_fulfillments(external_id,user_id,provider,period_days) values ('global',${other},'two',1)`,{code:'23505'});
}));
test('deployed extension semantics: create, active extension, expired reset, global retry and exact provider/ID persistence',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await users(sql);
 await sql.begin(async tx=>{
  await tx.unsafe("SET LOCAL TIME ZONE 'UTC'");
  assert.equal((await tx`select extend_voople_plus_once(${owner},'first',30,'provider-one') as result`)[0].result,true);
  const [created]=await tx`select tier::text,started_at=(now() at time zone 'UTC') as starts,expires_at=((now()+interval '30 days') at time zone 'UTC') as expires,payment_provider,external_id from subscriptions where user_id=${owner}`;
  assert.deepEqual({...created},{tier:'plus',starts:true,expires:true,payment_provider:'provider-one',external_id:'first'});
  assert.equal((await tx`select extend_voople_plus_once(${owner},'second',7,'provider-two') as result`)[0].result,true);
  assert.equal((await tx`select started_at=(now() at time zone 'UTC') and expires_at=((now()+interval '37 days') at time zone 'UTC') as matches from subscriptions where user_id=${owner}`)[0].matches,true);
  const before=await tx`select row_to_json(t) as row from subscriptions t order by user_id`;
  assert.equal((await tx`select extend_voople_plus_once(${other},'first',1,'different-provider') as result`)[0].result,false);
  assert.deepEqual(await tx`select row_to_json(t) as row from subscriptions t order by user_id`,before);
  await tx`insert into subscriptions(user_id,tier,started_at,expires_at,payment_provider,external_id) values (${other},'pro','2000-01-01','2000-02-01','old','old')`;
  assert.equal((await tx`select extend_voople_plus_once(${other},'expired',1,'exact-provider') as result`)[0].result,true);
  const [expired]=await tx`select tier::text,started_at=(now() at time zone 'UTC') as starts,expires_at=((now()+interval '1 day') at time zone 'UTC') as expires,payment_provider,external_id from subscriptions where user_id=${other}`;
  assert.deepEqual({...expired},{tier:'plus',starts:true,expires:true,payment_provider:'exact-provider',external_id:'expired'});
 });
 assert.deepEqual((await sql`select external_id,user_id,provider,period_days from subscription_fulfillments order by external_id`).map(r=>({...r})),[
 {external_id:'expired',user_id:other,provider:'exact-provider',period_days:1},
 {external_id:'first',user_id:owner,provider:'provider-one',period_days:30},
 {external_id:'second',user_id:owner,provider:'provider-two',period_days:7},
 ]);
 const before=await snapshot(sql);
 assert.equal((await sql`select extend_voople_plus_once(${owner},'first',3650,'changed') as result`)[0].result,false);
 assert.deepEqual(await snapshot(sql),before);
}));
test('invalid periods and mid-subscription failure roll back the entire fulfillment atomically',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await users(sql);let before=await snapshot(sql);
 for(const days of [0,-1,3651])await assert.rejects(sql`select extend_voople_plus_once(${owner},'invalid',${days},'one')`,/Invalid subscription period/);
 await assert.rejects(sql`select extend_voople_plus_once(${owner},'invalid',null,'one')`,{code:'23502'});
 await assert.rejects(sql`select extend_voople_plus_once('00000000-0000-0000-0000-000000000099','invalid',1,'one')`,{code:'23503'});
 assert.deepEqual(await snapshot(sql),before);
 await sql.unsafe(`CREATE FUNCTION reject_subscription() RETURNS trigger LANGUAGE plpgsql AS $fixture$BEGIN RAISE EXCEPTION 'fixture subscription failure'; END$fixture$;
 CREATE TRIGGER reject_subscription BEFORE INSERT ON subscriptions FOR EACH ROW EXECUTE FUNCTION reject_subscription();`);
 before=await snapshot(sql);
 await assert.rejects(sql`select extend_voople_plus_once(${owner},'atomic',1,'one')`,/fixture subscription failure/);
 assert.deepEqual(await snapshot(sql),before);
}));
test('two overlapping service transactions serialize same external ID and extend only once',options,()=>disposable(async(sql,apply,testUrl)=>{
 await apply(file);await users(sql);
 const peer=postgres(testUrl,{max:2,prepare:false,connection:{statement_timeout:15000,lock_timeout:5000}});
 let release,ready,peerReady;const gate=new Promise(r=>{release=r;});const firstReady=new Promise(r=>{ready=r;});const secondReady=new Promise(r=>{peerReady=r;});let first,second,pid;
 try{
  first=sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');const [r]=await tx`select extend_voople_plus_once(${owner},'concurrent',30,'one') as result`;ready();await gate;return r.result;});
  await firstReady;
  second=peer.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');pid=(await tx`select pg_backend_pid() as pid`)[0].pid;peerReady();return (await tx`select extend_voople_plus_once(${owner},'concurrent',30,'one') as result`)[0].result;});
  await secondReady;let blocked=false;
  for(let attempt=0;attempt<40;attempt++){const [r]=await peer`select wait_event_type from pg_stat_activity where pid=${pid}`;if(r.wait_event_type==='Lock'){blocked=true;break;}await new Promise(r=>setTimeout(r,50));}
  assert.equal(blocked,true,'second transaction must overlap first and wait on its uncommitted fulfillment');release();
  assert.deepEqual(await Promise.all([first,second]),[true,false]);
  assert.equal((await sql`select count(*)::integer as n from subscription_fulfillments where external_id='concurrent'`)[0].n,1);
  assert.equal((await sql`select expires_at-started_at=interval '30 days' as once from subscriptions where user_id=${owner}`)[0].once,true);
 }finally{release();await Promise.allSettled([first,second]);await peer.end({timeout:5});}
}));
test('browser own payment read, no fulfillment rows/writes/RPC; service RPC allowed',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);
 for(const role of ['anon','authenticated'])await assert.rejects(sql.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`);await tx`select extend_voople_plus_once(${other},'denied',1,'one')`;}),{code:'42501'});
 for(const [role,id,n] of [['anon','',0],['authenticated',owner,1],['authenticated',other,0]])await sql.begin(async tx=>{
 await tx.unsafe(`SET LOCAL ROLE ${role}`);await tx`select set_config('request.jwt.claim.sub',${id},true)`;
 assert.equal((await tx`select count(*)::integer as n from payment_intents`)[0].n,n);
 assert.equal((await tx`select count(*)::integer as n from subscription_fulfillments`)[0].n,0);
 assert.equal((await tx`update payment_intents set status='changed' returning id`).length,0);
 });
 await sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');assert.equal((await tx`select extend_voople_plus_once(${other},'service',1,'one') as result`)[0].result,true);});
}));
