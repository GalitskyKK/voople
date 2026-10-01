import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { assertCommercePrerequisiteReadiness } from "../../scripts/commerce-prerequisite-readiness.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const file = "83-commerce-prerequisite-compatibility.sql";
const files = ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", file, "51-group-perk-allocations.sql"];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/commerce-prerequisite.json", import.meta.url), "utf8"));
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
    const apply = name => applyMigration(sql, { file: name, source: sources.get(name), releaseVersion: "commerce-prerequisite-test" });
    await apply(files[0]); await apply(files[1]);
    await run(sql, apply);
  } finally {
    if (sql) await sql.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end({ timeout: 5 });
  }
}

// Independent schema-only attestation fixture, rather than migration creation SQL.
async function installAttested(sql) {
  await sql.unsafe("CREATE TYPE public.subscription_tier AS ENUM ('plus','pro')");
  for (const t of fixture.tables) {
    await sql.unsafe(`CREATE TABLE public.${t.name} (${[
      ...t.columns.map(c => `${c[0]} ${c[1]}${c[3] !== null ? ` DEFAULT ${c[3]}` : ""}${c[2] ? "" : " NOT NULL"}`),
      ...t.constraints.map(c => `CONSTRAINT ${c[0]} ${c[1]}`),
    ].join(",")})`);
    for (const i of t.indexes.filter(i => !i[2])) await sql.unsafe(i[1]);
    await sql.unsafe(`ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY`);
    for (const [role, privilege] of t.grants) await sql.unsafe(`GRANT ${privilege} ON public.${t.name} TO ${role}`);
    for (const p of t.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON public.${t.name} FOR SELECT TO PUBLIC USING (${p.using_expression})`);
  }
}

async function seed(sql) {
  await sql.unsafe(`INSERT INTO users(id,username,display_name) VALUES
    ('00000000-0000-0000-0000-000000000001','owner','Owner'),
    ('00000000-0000-0000-0000-000000000002','other','Other');
    INSERT INTO chats(id,type) VALUES
    ('00000000-0000-0000-0000-000000000003','group'),
    ('00000000-0000-0000-0000-000000000004','group');
    INSERT INTO subscriptions(user_id,tier,started_at,expires_at,payment_provider,external_id)
      VALUES ('00000000-0000-0000-0000-000000000001','plus','2026-01-01','2099-01-01','test','fixture');
    INSERT INTO group_boosts(user_id,chat_id,slot,assigned_at,moved_at,idempotency_key)
      VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',1,
        '2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','00000000-0000-0000-0000-000000000005');
    INSERT INTO group_customization(chat_id,public_slug,vanity_invite_slug,tag,accent_color,banner_key)
      VALUES ('00000000-0000-0000-0000-000000000003','group_one','invite_one','ONE','#aabbcc','test/banner');`);
}

async function snapshot(sql) {
  return {
    rows: await Promise.all(fixture.tables.map(t => sql.unsafe(`SELECT row_to_json(t) AS row FROM public.${t.name} t ORDER BY row_to_json(t)::text`))),
    catalogs: await sql`select relname,relacl::text,relrowsecurity,relforcerowsecurity from pg_class
      where relnamespace='public'::regnamespace order by relname`,
    policies: await sql`select * from pg_policies where schemaname='public' order by tablename,policyname`,
    constraints: await sql`select conname,pg_get_constraintdef(oid,true) as definition from pg_constraint
      where connamespace='public'::regnamespace order by conname`,
    indexes: await sql`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`,
    triggers: await sql`select tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal order by tgname`,
  };
}

test("commerce absent objects create exact current contract; ledger once; checksum no-op; migration 51 resolves real tables", options, () => disposable(async (sql, apply) => {
  assert.equal((await apply(file)).status, "applied");
  await assertCommercePrerequisiteReadiness(sql);
  await seed(sql);
  await apply("51-group-perk-allocations.sql");
  assert.equal((await sql`select group_effective_boost_capacity('00000000-0000-0000-0000-000000000003') as n`)[0].n,1);
  const before = await snapshot(sql);
  const ledger = await sql`select * from app_schema_migrations order by id`;
  assert.equal((await apply(file)).status,"already-applied");
  assert.deepEqual(await sql`select * from app_schema_migrations order by id`,ledger);
  assert.deepEqual(await snapshot(sql),before);
  assert.equal(ledger.filter(r => r.id === file).length,1);
  assert.equal(ledger.find(r => r.id === file).checksum,migrationChecksum(sources.get(file)));
  await assert.rejects(applyMigration(sql,{file,source:sources.get(file)+"\n-- drift",releaseVersion:"drift"}),/checksum mismatch/);
}));

test("attested existing commerce adopts without changing rows, constraints, policies, ACLs or compatible additions; read-only readiness", options, () => disposable(async (sql, apply) => {
  await installAttested(sql); await seed(sql);
  await sql.unsafe(`ALTER TABLE group_customization ADD COLUMN compatible_extra text DEFAULT 'preserved';
    CREATE INDEX compatible_extra_idx ON group_customization(compatible_extra);
    CREATE FUNCTION commerce_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    CREATE TRIGGER commerce_extra_trigger BEFORE UPDATE ON group_customization FOR EACH ROW EXECUTE FUNCTION commerce_extra_trigger();`);
  const before = await snapshot(sql);
  await apply(file);
  assert.deepEqual(await snapshot(sql),before);
  await assertCommercePrerequisiteReadiness(sql);
  assert.deepEqual(await snapshot(sql),before);
}));

const driftCases = [
  ["enum order", "ALTER TYPE subscription_tier RENAME TO old_tier; CREATE TYPE subscription_tier AS ENUM ('pro','plus')"],
  ["enum label", "ALTER TYPE subscription_tier ADD VALUE 'other'"],
  ["subscription timestamp", "ALTER TABLE subscriptions ALTER COLUMN expires_at TYPE timestamptz"],
  ["boost timestamp", "ALTER TABLE group_boosts ALTER COLUMN assigned_at TYPE timestamp"],
  ["customization timestamp", "ALTER TABLE group_customization ALTER COLUMN boost_grace_until TYPE timestamp"],
  ["slot type", "ALTER TABLE group_boosts ALTER COLUMN slot TYPE integer"],
  ["collation", "ALTER TABLE subscriptions ALTER COLUMN external_id TYPE varchar(200) COLLATE \"C\""],
  ["nullability", "ALTER TABLE subscriptions ALTER COLUMN external_id DROP NOT NULL"],
  ["default", "ALTER TABLE group_customization ALTER COLUMN updated_at SET DEFAULT '2000-01-01'::timestamptz"],
  ["PK", "ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_pkey"],
  ["FK", "ALTER TABLE group_boosts DROP CONSTRAINT group_boosts_chat_id_fkey; ALTER TABLE group_boosts ADD CONSTRAINT wrong_fk FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE SET NULL"],
  ["FK enforcement", "ALTER TABLE group_boosts DISABLE TRIGGER ALL"],
  ["slot constraint", "ALTER TABLE group_boosts DROP CONSTRAINT group_boosts_slot_check"],
  ["customization check", "ALTER TABLE group_customization DROP CONSTRAINT group_customization_tag_format_check"],
  ["slot uniqueness", "DROP INDEX group_boosts_user_slot_unique"],
  ["idempotency uniqueness", "DROP INDEX group_boosts_idempotency_unique"],
  ["partial index", "DROP INDEX group_customization_public_slug_unique; CREATE UNIQUE INDEX group_customization_public_slug_unique ON group_customization(public_slug)"],
  ["vanity partial index", "DROP INDEX group_customization_vanity_invite_slug_unique"],
  ["RLS", "ALTER TABLE group_boosts DISABLE ROW LEVEL SECURITY"],
  ["forced RLS", "ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY"],
  ["policy", "ALTER POLICY subscriptions_select_own ON subscriptions USING(true)"],
  ["extra policy", "CREATE POLICY broad_read ON group_boosts USING(true)"],
  ["grant", "REVOKE SELECT ON subscriptions FROM authenticated"],
  ["PUBLIC access", "GRANT SELECT ON subscriptions TO PUBLIC"],
];
for (const [name, ddl] of driftCases) test(`commerce ${name} fails closed in adoption and readiness; no ledger`, options, () => disposable(async (sql, apply) => {
  await installAttested(sql); await sql.unsafe(ddl);
  await assert.rejects(apply(file),/Commerce prerequisite incompatible/);
  await assert.rejects(assertCommercePrerequisiteReadiness(sql),/Commerce prerequisite incompatible/);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n,0);
}));

test("incompatible preexisting enum rolls back newly created commerce tables and ledger", options, () => disposable(async (sql, apply) => {
  await sql.unsafe("CREATE TYPE subscription_tier AS ENUM ('wrong')");
  await assert.rejects(apply(file),/Commerce prerequisite incompatible/);
  for (const t of fixture.tables) assert.equal((await sql`select to_regclass(${`public.${t.name}`}) as name`)[0].name,null);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,2);
}));

test("duplicate-sensitive Boost and partial slug uniqueness; nullable slug multiplicity; RLS self-only read and denied writes", options, () => disposable(async (sql, apply) => {
  await apply(file); await seed(sql);
  await assert.rejects(sql.unsafe(`INSERT INTO group_boosts SELECT user_id,chat_id,created_at,slot,assigned_at,moved_at,gen_random_uuid() FROM group_boosts`),{code:"23505"});
  await assert.rejects(sql.unsafe(`INSERT INTO group_boosts SELECT user_id,chat_id,created_at,2,assigned_at,moved_at,idempotency_key FROM group_boosts`),{code:"23505"});
  for (const column of ["public_slug","vanity_invite_slug"]) await assert.rejects(sql.unsafe(`INSERT INTO group_customization(chat_id,${column}) SELECT '00000000-0000-0000-0000-000000000004',${column} FROM group_customization`),{code:"23505"});
  await sql.unsafe(`INSERT INTO group_customization(chat_id) VALUES ('00000000-0000-0000-0000-000000000004'); UPDATE group_customization SET public_slug=null,vanity_invite_slug=null`);
  for (const [role,id,expected] of [["authenticated","1",1],["authenticated","2",0],["anon","",0]]) {
    await sql.begin(async tx => {
      await tx.unsafe(`SET LOCAL ROLE ${role}`);
      await tx`select set_config('request.jwt.claim.sub',${id ? `00000000-0000-0000-0000-00000000000${id}` : ""},true)`;
      assert.equal((await tx`select count(*)::integer as n from subscriptions`)[0].n,expected);
      for (const table of ["group_boosts","group_customization"]) assert.equal((await tx.unsafe(`SELECT count(*)::integer AS n FROM ${table}`))[0].n,0);
      assert.equal((await tx`update subscriptions set external_id='denied' returning user_id`).length,0);
    });
  }
  await sql.begin(async tx => {
    await tx.unsafe("SET LOCAL ROLE service_role");
    assert.equal((await tx`select count(*)::integer as n from group_boosts`)[0].n,1);
  });
}));
