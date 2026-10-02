import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import postgres from 'postgres';
import { applyMigration } from '../../scripts/migration-runner.mjs';
import { migrationChecksum } from '../../scripts/migration-checksum.mjs';
import { assertGroupRuntimeRpcReadiness } from '../../scripts/group-runtime-rpc-readiness.mjs';
import { ensureTestRoles } from './helpers/test-roles.mjs';

const databaseUrl=process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if(process.env.CI==='true'&&!databaseUrl)throw Error('CI requires VOOPLE_TEST_DATABASE_URL; no production fallback');
const file='88-group-runtime-rpc-compatibility.sql';
const prerequisites=['45-app-schema-migrations.sql','82-core-baseline-compatibility.sql','83-commerce-prerequisite-compatibility.sql','84-commerce-base-compatibility.sql','85-wallet-ledger-compatibility.sql','86-payment-fulfillment-compatibility.sql','87-promo-compatibility.sql'];
const sources=new Map(await Promise.all([...prerequisites,file].map(async name=>[name,await readFile(new URL('../../drizzle/'+name,import.meta.url),'utf8')])));
const fixture=JSON.parse(await readFile(new URL('../fixtures/group-runtime-rpc.json',import.meta.url),'utf8'));
const options={skip:databaseUrl?false:'VOOPLE_TEST_DATABASE_URL absent; no production fallback',timeout:120000};
async function disposable(run){
 const url=new URL(databaseUrl);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Group RPC tests require loopback disposable PostgreSQL');
 const name='voople_group_rpc_'+crypto.randomUUID().replaceAll('-','');
 const admin=postgres(databaseUrl,{max:1,prepare:false,connect_timeout:5});let sql;
 try{
  await ensureTestRoles(admin);await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE template0`);url.pathname='/'+name;
  sql=postgres(url.toString(),{max:1,prepare:false,connect_timeout:5,connection:{statement_timeout:15000,lock_timeout:5000}});
  await sql.unsafe(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
   GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`);
  const apply=name=>applyMigration(sql,{file:name,source:sources.get(name),releaseVersion:'group-rpc-test'});
  for(const name of prerequisites)await apply(name);
  await run(sql,apply,url.toString());
 }finally{if(sql)await sql.end({timeout:5});await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);await admin.end({timeout:5});}
}
async function installAttested(sql){for(const f of fixture.functions){await sql.unsafe(f.definition);await sql.unsafe(`REVOKE EXECUTE ON FUNCTION ${f.signature} FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION ${f.signature} TO service_role`);}}
const rowTables=['users','chats','chat_members','subscriptions','group_boosts','group_customization','user_wallets','wallet_transactions','user_inventory','personal_plan_grants','group_charges'];
async function snapshot(sql){return {
 functions:await sql`select p.oid,p.proname,pg_get_functiondef(p.oid) as definition,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.oid`,
 rows:await Promise.all(rowTables.filter(n=>!['personal_plan_grants','group_charges'].includes(n)).map(n=>sql.unsafe(`select row_to_json(t) as row from ${n} t order by row_to_json(t)::text`))),
 catalogs:await sql`select relname,relacl::text,relreplident,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace order by relname`,
 indexes:await sql`select * from pg_indexes where schemaname='public' order by indexname`,
 triggers:await sql`select tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal order by tgname`,
};}
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const group='00000000-0000-0000-0000-000000000010',next='00000000-0000-0000-0000-000000000011',child='00000000-0000-0000-0000-000000000012',direct='00000000-0000-0000-0000-000000000013',missing='00000000-0000-0000-0000-000000000099';
const key='00000000-0000-0000-0000-000000000020',key2='00000000-0000-0000-0000-000000000021';
async function seed(sql){
 await sql`insert into users(id,username,display_name) values (${owner},'owner','Owner'),(${other},'other','Other')`;
 await sql`insert into chats(id,type,name) values (${group},'group','Group'),(${next},'group','Next'),(${direct},'direct','Direct')`;
 await sql`insert into chats(id,type,parent_chat_id) values (${child},'group',${group})`;
 await sql`insert into chat_members(chat_id,user_id,role) values (${group},${owner},'owner'),(${next},${owner},'owner'),(${child},${owner},'owner'),(${direct},${owner},'owner')`;
 await sql`insert into subscriptions(user_id,tier,expires_at,payment_provider,external_id) values (${owner},'plus',now()+interval '1 day','fixture','fixture')`;
 await sql`insert into group_customization(chat_id,vanity_invite_slug,boost_grace_until,boost_grace_level) values (${group},'valid_slug',now()+interval '1 day',24)`;
}
async function accept(sql,user=other,slug='valid_slug'){return(await sql`select accept_group_vanity_invite(${slug},${user}) as result`)[0].result;}
async function assign(sql,slot=1,target=group,id=key,user=owner){await sql`select assign_group_boost_slot(${user},${slot}::smallint,${target}::uuid,${id}::uuid)`;}
async function age(sql){await sql`update group_boosts set moved_at=now()-interval '8 days'`;}

test('fresh exact RPCs, no row changes, hardened immediately, immutable checksum no-op',options,()=>disposable(async(sql,apply)=>{
 const rows=(await snapshot(sql)).rows;await assert.rejects(assertGroupRuntimeRpcReadiness(sql),/Group runtime RPC incompatible/);
 await apply(file);await assertGroupRuntimeRpcReadiness(sql);assert.deepEqual((await snapshot(sql)).rows,rows);
 for(const f of fixture.functions)assert.equal((await sql`select md5(replace(pg_get_functiondef(to_regprocedure(${f.signature})),chr(13)||chr(10),chr(10))) as hash`)[0].hash,f.definition_md5_lf);
 const before=await snapshot(sql),ledger=await sql`select * from app_schema_migrations order by id`;
 assert.equal((await apply(file)).status,'already-applied');assert.deepEqual(await snapshot(sql),before);assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
 assert.equal(ledger.find(r=>r.id===file).checksum,migrationChecksum(sources.get(file)));
 await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+'\n-- drift',releaseVersion:'changed'}),/checksum mismatch/);
}));
test('attested adoption preserves OIDs, bodies, ACLs, rows and unrelated compatible extras',options,()=>disposable(async(sql,apply)=>{
 await installAttested(sql);await seed(sql);await assign(sql);
 await sql.unsafe(`ALTER TABLE users ADD COLUMN compatible_extra text DEFAULT 'preserved'; CREATE INDEX compatible_extra_idx ON users(compatible_extra);
 CREATE FUNCTION compatible_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
 CREATE TRIGGER compatible_extra_trigger BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION compatible_extra_trigger();`);
 const before=await snapshot(sql);await apply(file);assert.deepEqual(await snapshot(sql),before);await assertGroupRuntimeRpcReadiness(sql);assert.deepEqual(await snapshot(sql),before);
}));
for(const f of fixture.functions){
 const sig=f.signature;
 const drift=[
  ['signature',`DROP FUNCTION ${sig}; CREATE FUNCTION public.${f.name}(text) RETURNS ${f.result} LANGUAGE plpgsql AS 'BEGIN RETURN ${f.result==='uuid'?'NULL':''}; END'`],
  ['overload',`CREATE FUNCTION public.${f.name}(text) RETURNS ${f.result} LANGUAGE plpgsql AS 'BEGIN RETURN ${f.result==='uuid'?'NULL':''}; END'`],
  ['result',`DROP FUNCTION ${sig}; CREATE FUNCTION ${sig} RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS 'BEGIN RETURN 0; END'`],
  ['language',f.definition.slice(0,f.definition.indexOf('\n RETURNS'))+` RETURNS ${f.result} LANGUAGE sql AS 'SELECT ${f.result==='uuid'?'null::uuid':'null::void'}'`],
  ['security',`ALTER FUNCTION ${sig} SECURITY INVOKER`],['search_path',`ALTER FUNCTION ${sig} SET search_path=pg_catalog`],
  ['extra config',`ALTER FUNCTION ${sig} SET statement_timeout='1s'`],['volatility',`ALTER FUNCTION ${sig} STABLE`],
  ['strictness',`ALTER FUNCTION ${sig} STRICT`],['parallel',`ALTER FUNCTION ${sig} PARALLEL SAFE`],
  ['defaults',f.definition.replace(f.name==='accept_group_vanity_invite'?'p_user_id uuid)':'p_idempotency_key uuid)',f.name==='accept_group_vanity_invite'?'p_user_id uuid DEFAULT NULL::uuid)':'p_idempotency_key uuid DEFAULT NULL::uuid)')],
  ['body',f.definition.replace(/\bbegin\b/i,match=>match+'\n  -- incompatible body')],
  ...['PUBLIC','anon','authenticated'].map(role=>[role+' EXECUTE',`GRANT EXECUTE ON FUNCTION ${sig} TO ${role}`]),
  ['service EXECUTE',`REVOKE EXECUTE ON FUNCTION ${sig} FROM service_role`],
 ];
 for(const [name,ddl] of drift)test(`${f.name} ${name} rejects adoption/readiness without repair`,options,()=>disposable(async(sql,apply)=>{
  await installAttested(sql);await sql.unsafe(ddl);const before=await snapshot(sql);
  await assert.rejects(apply(file),/Group runtime RPC incompatible/);await assert.rejects(assertGroupRuntimeRpcReadiness(sql),/Group runtime RPC incompatible/);
  assert.deepEqual(await snapshot(sql),before);assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
 }));
}
test('second invalid RPC rolls back newly created first RPC and ledger',options,()=>disposable(async(sql,apply)=>{
 const f=fixture.functions[1];await sql.unsafe(f.definition);await sql.unsafe(`ALTER FUNCTION ${f.signature} SECURITY INVOKER`);const before=await snapshot(sql);
 await assert.rejects(apply(file),/Group runtime RPC incompatible/);assert.deepEqual(await snapshot(sql),before);
 assert.equal((await sql`select to_regprocedure(${fixture.functions[0].signature}) as oid`)[0].oid,null);
 assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));

test('vanity accepts via grace, inserts member once, preserves customization/Boosts and rejects invalid FK',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);const customization=await sql`select * from group_customization`,boosts=await sql`select * from group_boosts`;
 assert.equal(await accept(sql),group);assert.equal(await accept(sql),group);
 assert.deepEqual([...(await sql`select role from chat_members where chat_id=${group} and user_id=${other}`)],[{role:'member'}]);
 assert.deepEqual(await sql`select * from group_customization`,customization);assert.deepEqual(await sql`select * from group_boosts`,boosts);
 const before=await snapshot(sql);await assert.rejects(accept(sql,missing),{code:'23503'});assert.deepEqual(await snapshot(sql),before);
}));
test('vanity exact case, missing/non-group/ineligible slug and expired grace guards preserve state',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);
 for(const slug of ['missing_slug','VALID_SLUG',null])await assert.rejects(accept(sql,other,slug),/Invite is unavailable/);
 await sql`update group_customization set boost_grace_level=23`;await assert.rejects(accept(sql),/Invite is unavailable/);
 await sql.begin(async tx=>{await tx`update group_customization set boost_grace_level=24,boost_grace_until=now()`;await assert.rejects(accept(tx),/Invite is unavailable/);throw Error('fixture rollback');}).catch(e=>assert.match(e.message,/fixture rollback/));
 await sql`update group_customization set chat_id=${direct},boost_grace_level=24`;const before=await snapshot(sql);await assert.rejects(accept(sql),/Invite is unavailable/);assert.deepEqual(await snapshot(sql),before);
}));
test('vanity counts 24 boosts with 72-hour subscription grace; exact expiry boundary excluded',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);await sql`update group_customization set boost_grace_until=null,boost_grace_level=null`;
 for(let i=30;i<38;i++){
  const user=`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
  await sql`insert into users(id,username,display_name) values (${user},${'fixture'+i},'Fixture')`;
  await sql`insert into subscriptions(user_id,tier,expires_at,payment_provider,external_id) values (${user},'plus',now()-interval '71 hours','fixture','fixture')`;
  for(let slot=1;slot<=3;slot++)await sql`insert into group_boosts(user_id,slot,chat_id,assigned_at,moved_at,idempotency_key) values (${user},${slot},${group},now(),now(),${crypto.randomUUID()})`;
 }
 assert.equal(await accept(sql),group);
 await sql.begin(async tx=>{await tx`update subscriptions set expires_at=now()-interval '72 hours'`;await assert.rejects(accept(tx,owner),/Invite is unavailable/);throw Error('fixture rollback');}).catch(e=>assert.match(e.message,/fixture rollback/));
 await sql`delete from group_boosts where (user_id,slot) in (select user_id,slot from group_boosts limit 1)`;
 await assert.rejects(accept(sql,owner),/Invite is unavailable/);
}));
test('vanity full-group guard follows existing-member return and rolls back failed insertion',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);
 for(let i=30;i<49;i++){const user=`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;await sql`insert into users(id,username,display_name) values (${user},${'fixture'+i},'Fixture')`;await sql`insert into chat_members(chat_id,user_id,role) values (${group},${user},'member')`;}
 assert.equal(await accept(sql,owner),group);const before=await snapshot(sql);await assert.rejects(accept(sql),/Group is full/);assert.deepEqual(await snapshot(sql),before);
 await sql`delete from chat_members where chat_id=${group} and user_id<>${owner}`;
 await sql.unsafe(`CREATE FUNCTION reject_member() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''fixture insert failure''; END'; CREATE TRIGGER reject_member AFTER INSERT ON chat_members FOR EACH ROW EXECUTE FUNCTION reject_member();`);
 const triggered=await snapshot(sql);await assert.rejects(accept(sql),/fixture insert failure/);assert.deepEqual(await snapshot(sql),triggered);
}));
test('Boost valid three slots, same-key retry, same-target reset and move grace before reassignment',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);await assign(sql);const first=await sql`select * from group_boosts`;
 await assign(sql);assert.deepEqual(await sql`select * from group_boosts`,first);
 await assign(sql,2,group,key2);await assign(sql,3,group,crypto.randomUUID());
 await age(sql);await sql`update group_boosts set assigned_at=now()-interval '8 days'`;
 const created=(await sql`select created_at from group_boosts where slot=1`)[0].created_at;
 await sql.begin(async tx=>{await assign(tx,1,group,key2.replace(/21$/,'22'));assert.equal((await tx`select assigned_at=now() and moved_at=now() as exact from group_boosts where slot=1`)[0].exact,true);});
 assert.deepEqual((await sql`select created_at from group_boosts where slot=1`)[0].created_at,created);
 await assert.rejects(assign(sql,1,next,crypto.randomUUID()),/boost_slot_cooldown/);await age(sql);
 await sql.begin(async tx=>{await assign(tx,1,next,crypto.randomUUID());assert.equal((await tx`select boost_grace_level=3 and boost_grace_until=now()+interval '72 hours' and updated_at=now() as exact from group_customization where chat_id=${group}`)[0].exact,true);});
 assert.equal((await sql`select chat_id from group_boosts where slot=1`)[0].chat_id,next);
 await assert.rejects(assign(sql,1,null,crypto.randomUUID()),/boost_slot_cooldown/);await age(sql);await assign(sql,1,null,crypto.randomUUID());
 assert.equal((await sql`select chat_id from group_boosts where slot=1`)[0].chat_id,null);
 assert.equal((await sql`select boost_grace_level from group_customization where chat_id=${next}`)[0].boost_grace_level,1);
}));
test('Boost validates subscription/membership before idempotency; same key with eligible new target stays unchanged',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);await assign(sql);const first=await snapshot(sql);await assign(sql,1,next,key);assert.deepEqual(await snapshot(sql),first);
 await assert.rejects(assign(sql,1,missing,key),/group_membership_required/);
 await sql`update subscriptions set expires_at=now()-interval '1 second'`;await assert.rejects(assign(sql),/active_subscription_required/);
 await sql`delete from subscriptions`;await assert.rejects(assign(sql,1,null,key),/active_subscription_required/);
}));
for(const [name,slot,target,id,user,message] of [
 ['zero slot',0,group,key,owner,/invalid_boost_slot/],['fourth slot',4,group,key,owner,/invalid_boost_slot/],
 ['missing user',1,group,key,missing,/active_subscription_required/],['nonmember',1,group,key,other,/active_subscription_required/],
 ['missing group',1,missing,key,owner,/group_membership_required/],['child group',1,child,key,owner,/group_membership_required/],['direct',1,direct,key,owner,/group_membership_required/],
 ['null key',1,group,null,owner,{code:'23502'}],['null slot',null,group,key,owner,{code:'23502'}],
])test(`Boost ${name} fails without changes`,options,()=>disposable(async(sql,apply)=>{await apply(file);await seed(sql);const before=await snapshot(sql);await assert.rejects(assign(sql,slot,target,id,user),message);assert.deepEqual(await snapshot(sql),before);}));
test('Boost active nonmember and exact subscription expiry are rejected; cross-slot reused key rolls back',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);await sql`insert into subscriptions(user_id,tier,expires_at,payment_provider,external_id) values (${other},'plus',now()+interval '1 day','fixture','fixture')`;
 await assert.rejects(assign(sql,1,group,key,other),/group_membership_required/);
 await sql.begin(async tx=>{await tx`update subscriptions set expires_at=now() where user_id=${owner}`;await assert.rejects(assign(tx),/active_subscription_required/);throw Error('fixture rollback');}).catch(e=>assert.match(e.message,/fixture rollback/));
 await assign(sql);const before=await snapshot(sql);await assert.rejects(assign(sql,2,group,key),{code:'23505'});assert.deepEqual(await snapshot(sql),before);
}));
test('Boost grace write and slot update roll back together on late failure',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);await assign(sql);await age(sql);
 await sql.unsafe(`CREATE FUNCTION reject_boost() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''fixture boost failure''; END'; CREATE TRIGGER reject_boost AFTER UPDATE ON group_boosts FOR EACH ROW EXECUTE FUNCTION reject_boost();`);
 const before=await snapshot(sql);await assert.rejects(assign(sql,1,next,key2),/fixture boost failure/);assert.deepEqual(await snapshot(sql),before);
}));
for(const kind of ['vanity','existing Boost','new Boost'])test(`${kind} overlapping requests preserve deployed locking behavior`,options,()=>disposable(async(sql,apply,url)=>{
 const vanity=kind==='vanity',fresh=kind==='new Boost';
 await apply(file);await seed(sql);if(!vanity&&!fresh){await assign(sql);await age(sql);}
 const peer=postgres(url,{max:2,prepare:false,connection:{statement_timeout:15000,lock_timeout:5000}});
 let release,ready,peerReady,pid,first,second;const gate=new Promise(r=>release=r),started=new Promise(r=>ready=r),peerStarted=new Promise(r=>peerReady=r);
 const call=tx=>vanity?accept(tx):assign(tx,1,next,key2);
 try{
  first=sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');const result=fresh?await assign(tx,1,group,key2):await call(tx);ready();await gate;return result;});await started;
  second=peer.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');pid=(await tx`select pg_backend_pid() as pid`)[0].pid;peerReady();return call(tx);});const outcome=second.then(result=>({result}),error=>({error}));await peerStarted;
  let blocked=false;for(let i=0;i<40;i++){if((await peer`select wait_event_type from pg_stat_activity where pid=${pid}`)[0].wait_event_type==='Lock'){blocked=true;break;}await new Promise(r=>setTimeout(r,50));}
  assert.equal(blocked,true);release();await first;assert.equal((await outcome).error,undefined);
  if(vanity)assert.equal((await sql`select count(*)::integer as n from chat_members where chat_id=${group} and user_id=${other}`)[0].n,1);
  else {assert.equal((await sql`select chat_id from group_boosts where slot=1`)[0].chat_id,next);assert.equal((await sql`select boost_grace_level from group_customization where chat_id=${group}`)[0].boost_grace_level,fresh?24:1);}
 }finally{release();await Promise.allSettled([first,second]);await peer.end({timeout:5});}
}));
test('browser denied both RPCs; trusted service executes both',options,()=>disposable(async(sql,apply)=>{
 await apply(file);await seed(sql);
 for(const role of ['anon','authenticated'])for(const run of [accept,assign])await assert.rejects(sql.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`);await run(tx);}),{code:'42501'});
 await sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role');assert.equal(await accept(tx),group);await assign(tx);});
}));
