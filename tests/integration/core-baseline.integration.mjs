import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import postgres from "postgres";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { migrationChecksum } from "../../scripts/migration-checksum.mjs";
import { RELEASE_APPLY_ORDER } from "../../scripts/migration-manifest.mjs";
import { assertCoreBaselineReadiness, coreBaselineValidationSql } from "../../scripts/core-baseline-readiness.mjs";
import { assertPaymentFulfillmentReadiness } from "../../scripts/payment-fulfillment-readiness.mjs";
import { assertPromoReadiness } from "../../scripts/promo-readiness.mjs";
import { assertWalletLedgerReadiness } from "../../scripts/wallet-ledger-readiness.mjs";
import { assertCommerceBaseReadiness } from "../../scripts/commerce-base-readiness.mjs";
import { assertCommercePrerequisiteReadiness } from "../../scripts/commerce-prerequisite-readiness.mjs";
import { assertLegacyCommerceRpcPrivileges } from "../../scripts/legacy-commerce-rpc-privileges.mjs";
import { ensureTestRoles } from "./helpers/test-roles.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");
const baseline = "82-core-baseline-compatibility.sql";
const sources = new Map(await Promise.all(RELEASE_APPLY_ORDER.map(async file => [file,
  await readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8")])));
const fixture = JSON.parse(await readFile(new URL("../fixtures/core-baseline-evolved.json", import.meta.url), "utf8"));
const quote = value => `'${value.replaceAll("'", "''")}'`;

// Each case uses a separate, empty database. Actual public/auth names, unchanged
// migration sources, real runner: no SQL rewriting or check_function_bodies bypass.
async function disposable(run) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Core baseline tests require a loopback disposable PostgreSQL server");
  const name = `voople_core_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 5 });
  let sql;
  try {
    await ensureTestRoles(admin);
    await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE template0`);
    url.pathname = `/${name}`;
    sql = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 5,
      connection: { statement_timeout: 15_000, lock_timeout: 5_000 } });
    await sql.unsafe(`CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;`);
    const apply = file => applyMigration(sql, { file, source: sources.get(file), releaseVersion: "core-baseline-test" });
    await run(sql, apply, url.toString());
  } finally {
    if (sql) await sql.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end({ timeout: 5 });
  }
}

async function installEvolved(sql) {
  await sql.unsafe("CREATE EXTENSION pg_trgm WITH SCHEMA public; CREATE PUBLICATION supabase_realtime");
  for (const [name, labels] of fixture.enums) await sql.unsafe(`CREATE TYPE public.${name} AS ENUM (${labels.map(quote).join(",")})`);
  for (const t of fixture.tables) await sql.unsafe(`CREATE TABLE public.${t.name} (${t.columns.map(c =>
    `${c[0]} ${c[1]}${c[3] !== null ? ` DEFAULT ${c[3]}` : ""}${c[2] ? "" : " NOT NULL"}`).join(",")})`);
  for (const t of fixture.tables) for (const [name, definition] of t.constraints.filter(c => !c[1].startsWith("FOREIGN KEY"))) {
    await sql.unsafe(`ALTER TABLE public.${t.name} ADD CONSTRAINT ${name} ${definition}`);
  }
  // The evolved reaction FK has a real migration-owned parent, not an ID stub.
  await sql.unsafe(sources.get("38-group-emojis.sql"));
  for (const t of fixture.tables) for (const [name, definition] of t.constraints.filter(c => c[1].startsWith("FOREIGN KEY"))) {
    await sql.unsafe(`ALTER TABLE public.${t.name} ADD CONSTRAINT ${name} ${definition}`);
  }
  await sql.unsafe(fixture.helper);
  await sql.unsafe("REVOKE ALL ON FUNCTION public.is_chat_member(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO anon, authenticated, service_role");
  for (const t of fixture.tables) {
    for (const definition of t.indexes) await sql.unsafe(definition);
    await sql.unsafe(`ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.${t.name} REPLICA IDENTITY ${t.replica === "f" ? "FULL" : "DEFAULT"}`);
    for (const p of t.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON public.${t.name} FOR ${{r:"SELECT",a:"INSERT",w:"UPDATE",d:"DELETE"}[p.command]} TO ${p.roles.join(",")}${p.using_expression ? ` USING (${p.using_expression})` : ""}${p.check_expression ? ` WITH CHECK (${p.check_expression})` : ""}`);
    for (const [role, privilege] of t.grants) await sql.unsafe(`GRANT ${privilege} ON public.${t.name} TO ${role}`);
  }
  await sql.unsafe("ALTER PUBLICATION supabase_realtime ADD TABLE chats,messages,message_reactions,notifications,posts,chat_rooms,chat_room_participants");
}

const options = { skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback", timeout: 120_000 };
test("fresh entire 45 -> 82 -> 83 -> 84 -> 85 -> 86 -> unchanged 38..81; readiness; immutable ledger", options, () => disposable(async (sql, apply, testUrl) => {
  await apply("45-app-schema-migrations.sql");
  await apply(baseline);
  assert.equal((await sql`select count(*)::integer as n from pg_class where relnamespace='public'::regnamespace and relkind='r'`)[0].n, 16);
  assert.equal((await sql`select count(*)::integer as n from information_schema.columns where table_schema='public' and (table_name,column_name) in (('messages','content'),('message_reactions','emoji_id'),('chats','join_policy'),('chat_rooms','session_id'))`)[0].n, 0);
  assert.equal((await sql`select enum_range(null::public.notif_type)::text as labels`)[0].labels,
    "{like,card_reaction,follow,reply,repost,match,mystery_drop,profile_canvas_draw,question}");
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where checksum='legacy-detected'`)[0].n, 0);
  await sql.begin("read only", tx => tx.unsafe(coreBaselineValidationSql({ current: false })));
  const ledger = await sql`select * from app_schema_migrations order by id`;
  assert.equal((await apply(baseline)).status, "already-applied");
  assert.deepEqual(await sql`select * from app_schema_migrations order by id`, ledger);
  assert.equal(ledger.find(r => r.id === baseline).checksum, migrationChecksum(sources.get(baseline)));
  await assert.rejects(applyMigration(sql, {file: baseline, source: sources.get(baseline) + "\n-- drift",releaseVersion:"changed"}), /checksum mismatch/);
  for (const file of RELEASE_APPLY_ORDER.slice(2)) assert.equal((await apply(file)).status, "applied", file);
  await assertCoreBaselineReadiness(sql);
  await assertCommercePrerequisiteReadiness(sql);
  await assertCommerceBaseReadiness(sql);
  await assertWalletLedgerReadiness(sql);
  await assertPaymentFulfillmentReadiness(sql);
  await assertPromoReadiness(sql);
  assert.equal((await assertLegacyCommerceRpcPrivileges(sql)).length, 5);
  // Local/CI test TLS is optional. All catalog readiness contracts run above;
  // when TLS is available also exercise the unchanged operational CLI end-to-end.
  const [{ tlsAvailable }] = await sql`select current_setting('ssl')='on' as "tlsAvailable"`;
  if (tlsAvailable) {
    const { stdout } = await promisify(execFile)(process.execPath, ["scripts/check-migration-readiness.mjs"], {
      env: { ...process.env, DIRECT_URL: testUrl, DATABASE_URL: testUrl }, timeout: 80_000,
    });
    assert.match(stdout,/Migration readiness passed/);
  }
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n, RELEASE_APPLY_ORDER.length);
  const completeLedger = await sql`select * from app_schema_migrations order by id`;
  for (const file of RELEASE_APPLY_ORDER) assert.equal((await apply(file)).status, "already-applied", file);
  assert.deepEqual(await sql`select * from app_schema_migrations order by id`, completeLedger);
  assert.equal((await sql`select group_effective_boost_capacity('00000000-0000-0000-0000-000000000002') as n`)[0].n, 0);
  assert.equal((await sql`select group_perk_is_active('00000000-0000-0000-0000-000000000002','hd'::varchar) as active`)[0].active, false);
  for (const name of ['promo_codes','promo_redemptions']) {
    assert.equal((await sql.unsafe(`select count(*)::integer as n from public.${name}`))[0].n, 0);
  }
}));

test("attested evolved fixture: adoption preserves rows, additions, ACLs, triggers and publication; readiness is read-only", options, () => disposable(async (sql, apply) => {
  await installEvolved(sql);
  await sql.unsafe(`INSERT INTO users(id,username,display_name) VALUES ('00000000-0000-0000-0000-000000000001','test','Fixture');
    INSERT INTO chats(id,type,join_policy) VALUES ('00000000-0000-0000-0000-000000000002','group','open');
    INSERT INTO chat_members(chat_id,user_id,role) SELECT chats.id,users.id,'owner' FROM chats,users;
    INSERT INTO messages(chat_id,sender_id,content) SELECT chats.id,users.id,'[]'::jsonb FROM chats,users;
    INSERT INTO chat_invites(chat_id,created_by,token_hash,expires_at,max_uses) SELECT chats.id,users.id,'fixture-token-hash',null,null FROM chats,users;
    INSERT INTO chat_rooms(chat_id,started_by) SELECT chats.id,users.id FROM chats,users;
    INSERT INTO notifications(user_id,type) SELECT id,'friend_request' FROM users;
    ALTER TABLE users ADD COLUMN later_extra text DEFAULT 'preserve';
    CREATE INDEX later_extra_idx ON users(later_extra);
    CREATE FUNCTION later_extra_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
    CREATE TRIGGER later_extra_trigger BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION later_extra_trigger();`);
  await apply("45-app-schema-migrations.sql");
  const snapshot = async () => ({
    rows: await sql`select row_to_json(u) as row from users u`, messages: await sql`select row_to_json(m) as row from messages m`,
    invites: await sql`select row_to_json(i) as row from chat_invites i`, rooms: await sql`select row_to_json(r) as row from chat_rooms r`,
    notifications: await sql`select row_to_json(n) as row from notifications n`,
    tables: await sql`select relname,relacl::text,relreplident from pg_class where relnamespace='public'::regnamespace order by relname`,
    policies: await sql`select * from pg_policies where schemaname='public' order by tablename,policyname`,
    triggers: await sql`select tgname,pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal order by tgname`,
    publication: await sql`select * from pg_publication_tables order by tablename`,
  });
  const before = await snapshot();
  assert.equal((await apply(baseline)).status, "applied");
  assert.deepEqual(await snapshot(), before);
  await assertCoreBaselineReadiness(sql);
  assert.deepEqual(await snapshot(), before);
  assert.equal((await apply(baseline)).status, "already-applied");
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${baseline}`)[0].n,1);
}));

test("fresh publication and existing extension schema are handled narrowly", options, () => disposable(async (sql, apply) => {
  await sql.unsafe("CREATE SCHEMA extensions; CREATE EXTENSION pg_trgm WITH SCHEMA extensions; CREATE PUBLICATION supabase_realtime");
  await apply("45-app-schema-migrations.sql"); await apply(baseline);
  assert.deepEqual((await sql`select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename`).map(r=>r.tablename),
    ["chat_room_participants","chat_rooms","chats","message_reactions","messages","notifications","posts"]);
  assert.equal((await sql`select extnamespace::regnamespace::text as namespace from pg_extension where extname='pg_trgm'`)[0].namespace,"extensions");
}));

test("incompatible helper signature rejects creation and rolls back the baseline", options, () => disposable(async (sql, apply) => {
  await apply("45-app-schema-migrations.sql");
  await sql.unsafe("CREATE FUNCTION is_chat_member(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'");
  await assert.rejects(apply(baseline),/incompatible is_chat_member signature/);
  assert.equal((await sql`select to_regclass('public.users') as object`)[0].object,null);
}));

const driftCases = [
  ["type", "ALTER TABLE users ALTER COLUMN display_name TYPE text"],
  ["nullability", "ALTER TABLE users ALTER COLUMN display_name DROP NOT NULL"],
  ["default", "ALTER TABLE users ALTER COLUMN show_online_status SET DEFAULT false"],
  ["PK", "ALTER TABLE follows DROP CONSTRAINT follows_follower_id_following_id_pk"],
  ["FK", "ALTER TABLE messages DROP CONSTRAINT messages_shared_track_id_playlist_tracks_id_fk; ALTER TABLE messages ADD CONSTRAINT wrong_fk FOREIGN KEY(shared_track_id) REFERENCES playlist_tracks(id) ON DELETE CASCADE"],
  ["enum", "ALTER TYPE track_source ADD VALUE 'incompatible'"],
  ["helper security", "ALTER FUNCTION is_chat_member(uuid) SECURITY INVOKER"],
  ["helper search_path", "ALTER FUNCTION is_chat_member(uuid) SET search_path=public,pg_temp"],
  ["helper semantics", "CREATE OR REPLACE FUNCTION is_chat_member(p_chat_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS 'SELECT true'"],
  ["helper access", "REVOKE EXECUTE ON FUNCTION is_chat_member(uuid) FROM authenticated"],
  ["RLS", "ALTER TABLE messages DISABLE ROW LEVEL SECURITY"],
  ["index", "DROP INDEX message_reactions_native_unique; CREATE UNIQUE INDEX message_reactions_native_unique ON message_reactions(message_id,user_id,emoji)"],
  ["policy", "ALTER POLICY messages_select_member ON messages USING(true)"],
];
for (const [name, ddl] of driftCases) test(`evolved ${name} drift fails closed`, options, () => disposable(async (sql, apply) => {
  await installEvolved(sql); await apply("45-app-schema-migrations.sql"); await sql.unsafe(ddl);
  await assert.rejects(apply(baseline), /Core baseline incompatible|must remain executable/);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${baseline}`)[0].n,0);
}));

test("failed fresh validation rolls back all newly created baseline objects", options, () => disposable(async (sql, apply) => {
  await apply("45-app-schema-migrations.sql");
  await sql.unsafe("CREATE TYPE public.track_source AS ENUM ('wrong')");
  await assert.rejects(apply(baseline));
  assert.equal((await sql`select to_regclass('public.users') as object`)[0].object,null);
  assert.equal((await sql`select to_regtype('public.chat_type')::text as object`)[0].object,null);
  assert.equal((await sql`select count(*)::integer as n from app_schema_migrations`)[0].n,1);
}));

test("fresh baseline RLS permits root/section membership and denies outsiders; helper supports browser roles", options, () => disposable(async (sql, apply) => {
  await apply("45-app-schema-migrations.sql"); await apply(baseline);
  await sql.unsafe(`INSERT INTO users(id,username,display_name) VALUES
    ('00000000-0000-0000-0000-000000000001','member','Member'),
    ('00000000-0000-0000-0000-000000000002','outsider','Outsider');
    INSERT INTO chats(id,type,parent_chat_id) VALUES
    ('00000000-0000-0000-0000-000000000003','group',null),
    ('00000000-0000-0000-0000-000000000004','group','00000000-0000-0000-0000-000000000003');
    INSERT INTO chat_members(chat_id,user_id) VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001');`);
  for (const [id, expected] of [["1",2],["2",0]]) await sql.begin(async tx => {
    await tx.unsafe("SET LOCAL ROLE authenticated");
    await tx`select set_config('request.jwt.claim.sub',${`00000000-0000-0000-0000-00000000000${id}`},true)`;
    assert.equal((await tx`select count(*)::integer as n from chats`)[0].n,expected);
    assert.equal((await tx`select is_chat_member('00000000-0000-0000-0000-000000000004') as member`)[0].member,expected>0);
  });
  await sql.begin(async tx => {
    await tx.unsafe("SET LOCAL ROLE anon");
    assert.equal((await tx`select is_chat_member('00000000-0000-0000-0000-000000000004') as member`)[0].member,false);
  });
}));
