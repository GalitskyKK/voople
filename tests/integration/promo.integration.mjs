import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { assertPromoReadiness } from "../../scripts/promo-readiness.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const file = "87-promo-compatibility.sql";
const files = ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", "84-commerce-base-compatibility.sql", "85-wallet-ledger-compatibility.sql", "86-payment-fulfillment-compatibility.sql", file];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/promo.json", import.meta.url), "utf8"));
const options = { skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback", timeout: 120_000 };

async function disposable(run) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Promo tests require a loopback disposable PostgreSQL server");
  const name = `voople_promo_test_${crypto.randomUUID().replaceAll("-", "")}`;
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
    const apply = name => applyMigration(sql, { file: name, source: sources.get(name), releaseVersion: "promo-test" });
    await apply(files[0]); await apply(files[1]); await apply(files[2]); await apply(files[3]); await apply(files[4]); await apply(files[5]);
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
    for (const i of t.indexes.filter(i=>!t.constraints.some(c=>c[0]===i[0]))) await sql.unsafe(i[1]);
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


const promo='00000000-0000-0000-0000-000000000010';
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function users(sql) {
 await sql`insert into users(id,username,display_name) values (${owner},'owner','Owner'),(${other},'other','Other')`;
}
async function seed(sql) {
 await users(sql);
 await sql`insert into promo_codes(id,code,kind,payload,max_redemptions,redemption_count,max_per_user,valid_from,valid_until,note,created_at) values (${promo},'MixedCase','legacy_kind','{"nested":{"array":[1,null,"fixture"]}}',0,2,3,'2026-01-01T12:34:56.123456Z','2025-01-01T12:34:56.123456Z','preserved','2026-01-01T12:34:56.123456Z')`;
 await sql`insert into promo_redemptions(promo_code_id,user_id,reference_type,reference_id,redeemed_at) values (${promo},${owner},'legacy','reference','2026-01-01T12:34:56.123456Z'),(${promo},${owner},null,null,'2026-01-02T12:34:56.123456Z')`;
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

const signature='claim_promo_redemption(uuid,uuid,varchar,varchar)';
async function eligible(sql, overrides={}) {
 await users(sql);
 await sql`insert into promo_codes ${sql({id:promo,code:'CaseSensitive',kind:'legacy',max_per_user:2,...overrides})}`;
}
async function claim(sql,user=owner,type='reference',id='same') {
 return (await sql`select claim_promo_redemption(${promo},${user},${type},${id}) as result`)[0].result;
}
test('fresh promo is exact and seedless, hardened, checksum-verified immutable no-op',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await assertPromoReadiness(sql);
 for(const name of ['promo_codes','promo_redemptions','user_wallets','wallet_transactions','subscriptions','user_inventory'])assert.equal((await sql.unsafe(`select count(*)::integer as n from ${name}`))[0].n,0);
 const before=await snapshot(sql),ledger=await sql`select * from app_schema_migrations order by id`;
 assert.equal((await apply(file)).status,'already-applied');assert.deepEqual(await snapshot(sql),before);
 assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
 assert.equal(ledger.find(r=>r.id===file).checksum,migrationChecksum(sources.get(file)));
 await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+'\n-- drift',releaseVersion:'drift'}),/checksum mismatch/);
}));
test('attested adoption preserves rows, nested payload, counts, timestamps, references, RPC ACL/body and compatible metadata',options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql);await seed(sql);
 await sql.unsafe(`ALTER TABLE promo_codes ADD COLUMN compatible_extra text DEFAULT 'preserved';
 CREATE INDEX compatible_extra_idx ON promo_codes(compatible_extra);
 CREATE FUNCTION promo_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
 CREATE TRIGGER promo_extra_trigger BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION promo_extra_trigger();`);
 const before=await snapshot(sql);await apply(file);assert.deepEqual(await snapshot(sql),before);
 await assertPromoReadiness(sql);assert.deepEqual(await snapshot(sql),before);
}));
const driftCases=[
 ['timestamp','ALTER TABLE promo_codes ALTER COLUMN valid_until TYPE timestamp'],
 ['redemption timestamp','ALTER TABLE promo_redemptions ALTER COLUMN redeemed_at TYPE timestamp'],
 ['varchar','ALTER TABLE promo_codes ALTER COLUMN code TYPE varchar(49)'],
 ['reference varchar','ALTER TABLE promo_redemptions ALTER COLUMN reference_id TYPE varchar(99)'],
 ['collation','ALTER TABLE promo_codes ALTER COLUMN code TYPE varchar(50) COLLATE "C"'],
 ['payload type','ALTER TABLE promo_codes ALTER COLUMN payload TYPE json'],
 ['payload default',`ALTER TABLE promo_codes ALTER COLUMN payload SET DEFAULT '{"drift":true}'::jsonb`],
 ['nullability','ALTER TABLE promo_codes ALTER COLUMN payload DROP NOT NULL'],
 ['max default','ALTER TABLE promo_codes ALTER COLUMN max_per_user SET DEFAULT 2'],
 ['code PK','ALTER TABLE promo_codes DROP CONSTRAINT promo_codes_pkey CASCADE'],
 ['redemption PK','ALTER TABLE promo_redemptions DROP CONSTRAINT promo_redemptions_pkey'],
 ['code uniqueness','ALTER TABLE promo_codes DROP CONSTRAINT promo_codes_code_unique'],
 ['user FK target','ALTER TABLE promo_redemptions DROP CONSTRAINT promo_redemptions_user_id_fkey; ALTER TABLE promo_redemptions ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE'],
 ['promo FK target','ALTER TABLE promo_redemptions DROP CONSTRAINT promo_redemptions_promo_code_id_fkey; ALTER TABLE promo_redemptions ADD CONSTRAINT wrong_fk FOREIGN KEY(promo_code_id) REFERENCES users(id) ON DELETE CASCADE'],
 ['FK action','ALTER TABLE promo_redemptions DROP CONSTRAINT promo_redemptions_promo_code_id_fkey; ALTER TABLE promo_redemptions ADD CONSTRAINT wrong_fk FOREIGN KEY(promo_code_id) REFERENCES promo_codes(id)'],
 ['FK validation','ALTER TABLE promo_redemptions DROP CONSTRAINT promo_redemptions_user_id_fkey; ALTER TABLE promo_redemptions ADD CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID'],
 ['max CHECK','ALTER TABLE promo_codes DROP CONSTRAINT promo_codes_max_per_user_check'],
 ['count CHECK','ALTER TABLE promo_codes DROP CONSTRAINT promo_codes_redemption_count_check'],
 ['active index','DROP INDEX promo_codes_active_idx; CREATE INDEX promo_codes_active_idx ON promo_codes(code,is_active)'],
 ['promo/user index','DROP INDEX promo_redemptions_promo_user_idx; CREATE UNIQUE INDEX promo_redemptions_promo_user_idx ON promo_redemptions(promo_code_id,user_id)'],
 ['extra per-user uniqueness','CREATE UNIQUE INDEX unexpected_one_use ON promo_redemptions(user_id,promo_code_id)'],
 ['descending index','DROP INDEX promo_redemptions_user_idx; CREATE INDEX promo_redemptions_user_idx ON promo_redemptions(user_id,redeemed_at)'],
 ['RLS','ALTER TABLE promo_codes DISABLE ROW LEVEL SECURITY'],
 ['forced RLS','ALTER TABLE promo_redemptions FORCE ROW LEVEL SECURITY'],
 ['browser policy','CREATE POLICY broad_read ON promo_codes FOR SELECT TO authenticated USING(true)'],
 ['redemption policy','CREATE POLICY broad_write ON promo_redemptions FOR INSERT TO PUBLIC WITH CHECK(true)'],
 ['grant','REVOKE SELECT ON promo_codes FROM authenticated'],
 ['PUBLIC grant','GRANT SELECT ON promo_redemptions TO PUBLIC'],
 ['signature',`ALTER FUNCTION ${signature} RENAME TO old_claim; CREATE FUNCTION claim_promo_redemption(text) RETURNS uuid LANGUAGE plpgsql AS 'BEGIN RETURN null; END'`],
 ['overload',"CREATE FUNCTION claim_promo_redemption(text) RETURNS uuid LANGUAGE plpgsql AS 'BEGIN RETURN null; END'"],
 ['result',`DROP FUNCTION ${signature}; CREATE FUNCTION claim_promo_redemption(uuid,uuid,varchar,varchar) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN 0; END'`],
 ['security',`ALTER FUNCTION ${signature} SECURITY INVOKER`],
 ['search_path',`ALTER FUNCTION ${signature} SET search_path=pg_catalog`],
 ['volatility',`ALTER FUNCTION ${signature} STABLE`],
 ['strictness',`ALTER FUNCTION ${signature} STRICT`],
 ['parallel',`ALTER FUNCTION ${signature} PARALLEL SAFE`],
 ['defaults',fixture.functions[0].definition.replace('p_reference_id character varying)','p_reference_id character varying DEFAULT NULL::character varying)')],
 ['body',"CREATE OR REPLACE FUNCTION claim_promo_redemption(p_promo_code_id uuid,p_user_id uuid,p_reference_type varchar,p_reference_id varchar) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN null; END'"],
 ...['PUBLIC','anon','authenticated'].map(role=>[role+' EXECUTE',`GRANT EXECUTE ON FUNCTION ${signature} TO ${role}`]),
 ['service EXECUTE',`REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role`],
];
for(const [name,ddl] of driftCases)test(`promo ${name} fails adoption/readiness without mutation or ledger`,options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql);await sql.unsafe(ddl);const before=await snapshot(sql);
 await assert.rejects(apply(file),/Promo incompatible/);await assert.rejects(assertPromoReadiness(sql),/Promo incompatible/);
 assert.deepEqual(await snapshot(sql),before);assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));
test('missing RPC uses the proven body; incompatible existing RPC rolls back all fresh tables and ledger',options,()=>disposable(async(sql,apply)=>{
 await sql.unsafe("CREATE FUNCTION claim_promo_redemption(uuid,uuid,varchar,varchar) RETURNS uuid LANGUAGE plpgsql AS 'BEGIN RETURN null; END'");
 await assert.rejects(apply(file),/Promo incompatible/);
 for(const t of fixture.tables)assert.equal((await sql`select to_regclass(${'public.'+t.name}) as n`)[0].n,null);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,6);
 await sql.unsafe(`DROP FUNCTION ${signature}`);await apply(file);await assertPromoReadiness(sql);
 assert.equal((await sql`select md5(replace(pg_get_functiondef(to_regprocedure(${fixture.functions[0].signature})),chr(13)||chr(10),chr(10))) as hash`)[0].hash,'cda399bc55d01e4ed51b653a15fb52ff');
}));
test('schema preserves case-sensitive code uniqueness, normal redemption index, nullable/negative caps and only attested checks',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql);
 await sql`insert into promo_codes(code,kind,max_redemptions,valid_from,valid_until) values ('casesensitive','anything',-1,'2099-01-01','2000-01-01')`;
 await assert.rejects(sql`insert into promo_codes(code,kind) values ('CaseSensitive','legacy')`,{code:'23505'});
 for(const [column,value] of [['max_per_user',0],['redemption_count',-1]])await assert.rejects(sql.unsafe(`UPDATE promo_codes SET ${column}=${value}`),{code:'23514'});
 await sql`insert into promo_redemptions(promo_code_id,user_id) values (${promo},${owner}),(${promo},${owner})`;
 assert.equal((await sql`select max_redemptions from promo_codes where id=${promo}`)[0].max_redemptions,null);
 assert.equal((await sql`select count(*)::integer as n from promo_redemptions`)[0].n,2);
}));
test('deployed success, count increment, references, retries until max_per_user and no reward mutation',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql);
 const first=await claim(sql),second=await claim(sql);assert.match(first,/^[0-9a-f-]{36}$/);assert.notEqual(first,second);
 const rows=await sql`select id,promo_code_id,user_id,reference_type,reference_id from promo_redemptions order by id`;
 assert.deepEqual(new Set(rows.map(r=>r.id)),new Set([first,second]));
 for(const row of rows)assert.deepEqual({...row},{id:row.id,promo_code_id:promo,user_id:owner,reference_type:'reference',reference_id:'same'});
 await assert.rejects(claim(sql),/Promo already used/);assert.equal((await sql`select redemption_count from promo_codes where id=${promo}`)[0].redemption_count,2);
 for(const name of ['user_wallets','wallet_transactions','subscriptions','user_inventory'])assert.equal((await sql.unsafe(`select count(*)::integer as n from ${name}`))[0].n,0);
 assert.equal((await sql`select redeemed_at <= now() as valid from promo_redemptions limit 1`)[0].valid,true);
}));
for(const [name,overrides,message] of [
 ['inactive',{is_active:false},/Promo is inactive/],
 ['future',{valid_from:'2099-01-01'},/Promo is not active yet/],
 ['expired',{valid_until:'2000-01-01'},/Promo has expired/],
 ['zero cap',{max_redemptions:0},/Promo limit reached/],
 ['negative cap',{max_redemptions:-1},/Promo limit reached/],
])test(`deployed ${name} guard preserves state`,options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql,overrides);const before=await snapshot(sql);await assert.rejects(claim(sql),message);assert.deepEqual(await snapshot(sql),before);
}));
test('deployed global cap across users, inclusive time boundaries, null references and no count recomputation',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql,{max_redemptions:1});await claim(sql);
 await assert.rejects(claim(sql,other),/Promo limit reached/);
 await sql`update promo_codes set max_redemptions=null,redemption_count=0`;
 await sql.begin(async tx=>{
  await tx`update promo_codes set valid_from=now(),valid_until=now()`;
  const id=await claim(tx,other,null,null);assert.equal((await tx`select reference_type is null and reference_id is null and redeemed_at=now() as exact from promo_redemptions where id=${id}`)[0].exact,true);
 });
 assert.equal((await sql`select redemption_count from promo_codes`)[0].redemption_count,1);
 assert.equal((await sql`select count(*)::integer as n from promo_redemptions`)[0].n,2);
}));
test('invalid promo/user and failure after insertion roll back count and redemption',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql);const before=await snapshot(sql);
 await assert.rejects(sql`select claim_promo_redemption('00000000-0000-0000-0000-000000000099',${owner},null,null)`,/Promo is inactive/);
 await assert.rejects(claim(sql,'00000000-0000-0000-0000-000000000099'),{code:'23503'});assert.deepEqual(await snapshot(sql),before);
 await sql.unsafe(`CREATE FUNCTION reject_count() RETURNS trigger LANGUAGE plpgsql AS $fixture$BEGIN RAISE EXCEPTION 'fixture count failure'; END$fixture$;
 CREATE TRIGGER reject_count BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION reject_count();`);
 const withTrigger=await snapshot(sql);await assert.rejects(claim(sql),/fixture count failure/);assert.deepEqual(await snapshot(sql),withTrigger);
}));
for(const perUser of [true,false])test(`overlapping claims serialize and enforce ${perUser?'per-user':'global'} cap`,options,()=>disposable(async(sql,apply,testUrl)=>{
 await apply(file);await eligible(sql,perUser?{max_per_user:1}:{max_per_user:2,max_redemptions:1});
 const peer=postgres(testUrl,{max:2,prepare:false,connection:{statement_timeout:15000,lock_timeout:5000}});
 let release,ready,peerReady,pid,first,second;const gate=new Promise(r=>release=r),firstReady=new Promise(r=>ready=r),secondReady=new Promise(r=>peerReady=r);
 try{
  first=sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');const result=await claim(tx);ready();await gate;return result;});await firstReady;
  second=peer.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');pid=(await tx`select pg_backend_pid() as pid`)[0].pid;peerReady();return claim(tx,perUser?owner:other);});
  const outcome=second.then(result=>({result}),error=>({error}));await secondReady;let blocked=false;
  for(let attempt=0;attempt<40;attempt++){const [r]=await peer`select wait_event_type from pg_stat_activity where pid=${pid}`;if(r.wait_event_type==='Lock'){blocked=true;break;}await new Promise(r=>setTimeout(r,50));}
  assert.equal(blocked,true,'second transaction must overlap and block on locked promo');release();assert.match(await first,/^[0-9a-f-]{36}$/);
  assert.match((await outcome).error.message,perUser?/Promo already used/:/Promo limit reached/);
  assert.equal((await sql`select count(*)::integer as n from promo_redemptions`)[0].n,1);assert.equal((await sql`select redemption_count from promo_codes`)[0].redemption_count,1);
 }finally{release();await Promise.allSettled([first,second]);await peer.end({timeout:5});}
}));
test('browser cannot read/mutate promo rows or execute claim; service may execute',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await eligible(sql);
 for(const role of ['anon','authenticated']){
  await sql.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`);for(const t of fixture.tables)assert.equal((await tx.unsafe(`select count(*)::integer as n from ${t.name}`))[0].n,0);assert.equal((await tx`update promo_codes set redemption_count=99 returning id`).length,0);});
  await assert.rejects(sql.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`);await claim(tx);}),{code:'42501'});
 }
 await sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');assert.match(await claim(tx),/^[0-9a-f-]{36}$/);});
}));
