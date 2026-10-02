import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { assertCommerceBaseReadiness } from "../../scripts/commerce-base-readiness.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const file = "84-commerce-base-compatibility.sql";
const files = ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", file];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/commerce-base.json", import.meta.url), "utf8"));
const options = { skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback", timeout: 120_000 };

async function disposable(run) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Commerce tests require a loopback disposable PostgreSQL server");
  const name = `voople_commerce_test_${crypto.randomUUID().replaceAll("-", "")}`;
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
    const apply = name => applyMigration(sql, { file: name, source: sources.get(name), releaseVersion: "commerce-base-test" });
    await apply(files[0]); await apply(files[1]); await apply(files[2]);
    await run(sql, apply);
  } finally {
    if (sql) await sql.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end({ timeout: 5 });
  }
}


// Independent schema-only production attestation fixture, never migration DDL.
async function installAttested(sql) {
  for (const [name, labels] of fixture.enums) await sql.unsafe(`CREATE TYPE public.${name} AS ENUM (${labels.map(l=>"'"+l+"'").join(',')})`);
  for (const t of fixture.tables) {
    await sql.unsafe(`CREATE TABLE public.${t.name} (${[
      ...t.columns.map(c=>`${c[0]} ${c[1]}${c[3]!==null ? ' DEFAULT '+c[3] : ''}${c[2] ? '' : ' NOT NULL'}`),
      ...t.constraints.map(c=>`CONSTRAINT ${c[0]} ${c[1]}`),
    ].join(',')})`);
    for (const i of t.indexes.filter(i=>!i[2])) await sql.unsafe(i[1]);
    await sql.unsafe(`ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY; ALTER TABLE public.${t.name} REPLICA IDENTITY DEFAULT`);
    for(const [role,privilege] of t.grants) await sql.unsafe(`GRANT ${privilege} ON public.${t.name} TO ${role}`);
    if(Number((await sql`select current_setting('server_version_num') as n`)[0].n)>=170000) await sql.unsafe(`GRANT MAINTAIN ON public.${t.name} TO anon,authenticated,service_role`);
    for(const p of t.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON public.${t.name} FOR ${{r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE'}[p.command]} TO PUBLIC${p.using_expression ? ' USING ('+p.using_expression+')' : ''}${p.check_expression ? ' WITH CHECK ('+p.check_expression+')' : ''}`);
  }
}
async function seed(sql) {
  await sql.unsafe(`INSERT INTO users(id,username,display_name) VALUES
    ('00000000-0000-0000-0000-000000000001','owner','Owner'),
    ('00000000-0000-0000-0000-000000000002','other','Other');
    INSERT INTO shop_items(id,type,name,price_rub,description) VALUES ('attested-frame','frame','Frame',0,'Fixture');
    INSERT INTO user_inventory(user_id,item_id,acquired_via,acquired_at) VALUES
      ('00000000-0000-0000-0000-000000000001','attested-frame','free_claim','2026-01-01 12:34:56.123456');
    INSERT INTO profile_customization(user_id,avatar_data,banner_value,profile_frame_id) VALUES
      ('00000000-0000-0000-0000-000000000001','{"fixture":true}','{"color":"#123456"}','attested-frame');`);
}
async function snapshot(sql) {
  return {
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


test('commerce base fresh exact contract, frame/free_claim, checksum no-op and immutable ledger',options,()=>disposable(async(sql,apply)=>{
  assert.equal((await apply(file)).status,'applied');
  await assertCommerceBaseReadiness(sql);
  for(const [name,labels] of fixture.enums) assert.deepEqual((await sql.unsafe(`SELECT unnest(enum_range(null::public.${name}))::text AS label`)).map(r=>r.label),labels);
  await seed(sql);
  const before=await snapshot(sql), ledger=await sql`select * from app_schema_migrations order by id`;
  assert.equal((await apply(file)).status,'already-applied');
  assert.deepEqual(await snapshot(sql),before);
  assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
  assert.equal(ledger.find(r=>r.id===file).checksum,migrationChecksum(sources.get(file)));
  await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+'\n-- drift',releaseVersion:'drift'}),/checksum mismatch/);
}));
test('attested commerce base adoption preserves every row and extra column/index/trigger/policy; readiness read-only',options,()=>disposable(async(sql,apply)=>{
  await installAttested(sql); await seed(sql);
  await sql.unsafe(`ALTER TABLE shop_items ADD COLUMN compatible_extra text DEFAULT 'preserved';
    CREATE INDEX compatible_extra_idx ON shop_items(compatible_extra);
    CREATE FUNCTION commerce_base_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    CREATE TRIGGER commerce_base_extra_trigger BEFORE UPDATE ON shop_items FOR EACH ROW EXECUTE FUNCTION commerce_base_extra_trigger();
    CREATE POLICY harmless_extra ON shop_items AS RESTRICTIVE FOR ALL TO PUBLIC USING(true) WITH CHECK(true);`);
  const before=await snapshot(sql);
  await apply(file); assert.deepEqual(await snapshot(sql),before);
  await assertCommerceBaseReadiness(sql); assert.deepEqual(await snapshot(sql),before);
}));
const driftCases=[
  ['enum order',"ALTER TYPE item_type RENAME TO old_item_type; CREATE TYPE item_type AS ENUM ('ring','effect','banner','nameplate','badge','reaction_pack','decoration','feed_card','app_theme','profile_background','frame')"],
  ['missing enum label',"ALTER TYPE acquired_via RENAME TO old_acquired_via; CREATE TYPE acquired_via AS ENUM ('purchase','earned','gifted','seasonal_reward')"],
  ['extra enum label',"ALTER TYPE item_type ADD VALUE 'unexpected'"],
  ['varchar typmod','ALTER TABLE shop_items ALTER COLUMN asset_folder TYPE varchar(100)'],
  ['collation','ALTER TABLE shop_items ALTER COLUMN name TYPE varchar(100) COLLATE "C"'],
  ['inventory timezone','ALTER TABLE user_inventory ALTER COLUMN acquired_at TYPE timestamptz'],
  ['profile timezone','ALTER TABLE profile_customization ALTER COLUMN updated_at TYPE timestamptz'],
  ['nullability','ALTER TABLE shop_items ALTER COLUMN price_rub DROP NOT NULL'],
  ['default','ALTER TABLE shop_items ALTER COLUMN price_rub SET DEFAULT 0'],
  ['generated identity','ALTER TABLE shop_items ALTER COLUMN price_rub ADD GENERATED BY DEFAULT AS IDENTITY'],
  ['PK','ALTER TABLE user_inventory DROP CONSTRAINT user_inventory_pkey'],
  ['UNIQUE','DROP INDEX inventory_unique'],
  ['FK target','ALTER TABLE user_inventory DROP CONSTRAINT user_inventory_user_id_users_id_fk; ALTER TABLE user_inventory ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE'],
  ['FK delete action','ALTER TABLE profile_customization DROP CONSTRAINT profile_customization_user_id_users_id_fk; ALTER TABLE profile_customization ADD CONSTRAINT wrong_fk FOREIGN KEY(user_id) REFERENCES users(id)'],
  ['FK deferrability','ALTER TABLE user_inventory ALTER CONSTRAINT user_inventory_item_id_shop_items_id_fk DEFERRABLE'],
  ['FK unvalidated','ALTER TABLE user_inventory DROP CONSTRAINT user_inventory_item_id_shop_items_id_fk; ALTER TABLE user_inventory ADD CONSTRAINT user_inventory_item_id_shop_items_id_fk FOREIGN KEY(item_id) REFERENCES shop_items(id) NOT VALID'],
  ['FK enforcement','ALTER TABLE user_inventory DISABLE TRIGGER ALL'],
  ['partial uniqueness','DROP INDEX inventory_unique; CREATE UNIQUE INDEX inventory_unique ON user_inventory(user_id,item_id) WHERE acquired_via=\'purchase\''],
  ['index expression','DROP INDEX shop_items_kind_idx; CREATE INDEX shop_items_kind_idx ON shop_items(lower(kind))'],
  ['missing index','DROP INDEX shop_items_sort_idx'],
  ['RLS','ALTER TABLE shop_items DISABLE ROW LEVEL SECURITY'],
  ['forced RLS','ALTER TABLE user_inventory FORCE ROW LEVEL SECURITY'],
  ['replica identity','ALTER TABLE profile_customization REPLICA IDENTITY FULL'],
  ['required policy','ALTER POLICY user_inventory_select_own ON user_inventory USING(true)'],
  ['missing policy','DROP POLICY profile_customization_update_own ON profile_customization'],
  ['extra mutation policy','CREATE POLICY broad_insert ON user_inventory FOR INSERT WITH CHECK(true)'],
  ['grant','REVOKE SELECT ON shop_items FROM authenticated'],
  ['PUBLIC grant','GRANT SELECT ON shop_items TO PUBLIC'],
];
for(const [name,ddl] of driftCases) test(`commerce base ${name} rejects adoption/readiness without ledger or mutations`,options,()=>disposable(async(sql,apply)=>{
  await installAttested(sql); await sql.unsafe(ddl);
  const before=await snapshot(sql);
  await assert.rejects(apply(file),/Commerce base incompatible/);
  await assert.rejects(assertCommerceBaseReadiness(sql),/Commerce base incompatible/);
  assert.deepEqual(await snapshot(sql),before);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));
test('validation failure rolls back every newly created table/type and ledger row',options,()=>disposable(async(sql,apply)=>{
  await sql.unsafe("CREATE TYPE item_type AS ENUM ('effect')");
  await assert.rejects(apply(file),/Commerce base incompatible/);
  for(const t of fixture.tables) assert.equal((await sql`select to_regclass(${'public.'+t.name}) as name`)[0].name,null);
  for(const [name] of fixture.enums.slice(1)) assert.equal((await sql`select to_regtype(${'public.'+name}) as name`)[0].name,null);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,3);
}));
test('deployed RLS effective public catalog/profile read, own inventory/profile writes and service access',options,()=>disposable(async(sql,apply)=>{
  await apply(file); await seed(sql);
  await assert.rejects(sql.unsafe(`INSERT INTO user_inventory(user_id,item_id,acquired_via) SELECT user_id,item_id,acquired_via FROM user_inventory`),{code:'23505'});
  for(const [role,id,n] of [['anon','',0],['authenticated','1',1],['authenticated','2',0]]) await sql.begin(async tx=>{
    await tx.unsafe(`SET LOCAL ROLE ${role}`);
    await tx`select set_config('request.jwt.claim.sub',${id ? '00000000-0000-0000-0000-00000000000'+id : ''},true)`;
    assert.equal((await tx`select count(*)::integer as n from shop_items`)[0].n,1);
    assert.equal((await tx`select count(*)::integer as n from profile_customization`)[0].n,1);
    assert.equal((await tx`select count(*)::integer as n from user_inventory`)[0].n,n);
    assert.equal((await tx`update shop_items set name='denied' returning id`).length,0);
    assert.equal((await tx`update user_inventory set acquired_at=now() returning id`).length,0);
    assert.equal((await tx`update profile_customization set nickname_color='#123456' returning user_id`).length,n);
  });
  await sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE service_role'); assert.equal((await tx`select count(*)::integer as n from user_inventory`)[0].n,1);});
}));
