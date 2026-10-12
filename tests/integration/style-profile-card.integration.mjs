import "../helpers/style-plan-runtime.mjs";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { ensureTestRoles } from "./helpers/test-roles.mjs";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { assertProfileCardReadiness } from "../../scripts/profile-card-readiness.mjs";
import { assertAppThemeReadiness } from "../../scripts/app-theme-readiness.mjs";
import { assertNicknameFontReadiness } from "../../scripts/nickname-font-readiness.mjs";
import { assertNicknameEffectReadiness } from "../../scripts/nickname-effect-readiness.mjs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/server/services/upload.service") return { shortCircuit: true,
    url: "data:text/javascript,export const resolvePublicMediaKey = () => { throw new Error('Unexpected upload'); };" };
  return next(specifier, context);
} });
const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
const restUrl = process.env.VOOPLE_TEST_POSTGREST_URL?.trim();
if (process.env.CI && (!databaseUrl || !restUrl)) throw new Error("CI requires disposable PostgreSQL/PostgREST; security tests cannot skip");
const options = { skip: databaseUrl && restUrl ? false : "Disposable loopback services required; no production fallback", timeout: 120_000 };
const file = "93-style-profile-card-write-boundary.sql";
const source = await readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8");
const sqlFile = name => readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8");
const secret = "disposable-theme-test-secret-at-least-32-characters";
function jwt(role, sub) {
  const encode = v => Buffer.from(JSON.stringify(v)).toString("base64url");
  const value = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role, sub, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64url")}`;
}
function loopback() {
  for (const value of [databaseUrl, restUrl]) assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname));
}

test("93 compatible adoption preserves rows; checksum no-op; readiness detects drift; atomic failure", options, async () => {
  loopback();
  const admin = postgres(databaseUrl, { max: 1, prepare: false });
  const name = `voople_card_${crypto.randomUUID().replaceAll("-", "")}`;
  const url = new URL(databaseUrl); url.pathname = `/${name}`;
  let sql;
  try {
    await ensureTestRoles(admin); await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE template0`);
    sql = postgres(url.toString(), { max: 1, prepare: false });
    await sql.unsafe(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;`);
    for (const base of ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", "84-commerce-base-compatibility.sql", "80-personal-plan-grant-foundation.sql", "89-style-app-theme-write-boundary.sql", "90-style-nickname-font-write-boundary.sql", "91-style-nickname-effect-write-boundary.sql", "92-style-nickname-color-write-boundary.sql"]) {
      await applyMigration(sql, { file: base, source: await sqlFile(base), releaseVersion: "theme-test" });
    }
    const user = crypto.randomUUID();
    await sql`insert into users(id,username,display_name) values (${user},'theme-test','Theme')`;
    await sql`insert into profile_customization(user_id,app_theme_id,nickname_color) values (${user},'violet','#123456')`;
    const before = await sql`select row_to_json(p) as row from profile_customization p`;
    const beforeAcl = await sql`select relacl::text from pg_class where oid='profile_customization'::regclass`;
    const apply = s => applyMigration(sql, { file, source: s, releaseVersion: "theme-test" });
    await assert.rejects(apply(source + "\nDO $$ BEGIN RAISE EXCEPTION 'rollback test'; END $$;"), /rollback test/);
    assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n, 0);
    assert.equal((await sql`select to_regprocedure('guard_profile_card_browser_write()') as fn`)[0].fn, null);
    assert.equal((await apply(source)).status, "applied"); await assertAppThemeReadiness(sql); await assertProfileCardReadiness(sql);
    await assertNicknameFontReadiness(sql); await assertNicknameEffectReadiness(sql);
    assert.deepEqual(await sql`select row_to_json(p) as row from profile_customization p`, before);
    assert.deepEqual(await sql`select relacl::text from pg_class where oid='profile_customization'::regclass`, beforeAcl);
    const ledger = await sql`select * from app_schema_migrations where id=${file}`;
    assert.equal((await apply(source)).status, "already-applied");
    assert.deepEqual(await sql`select * from app_schema_migrations where id=${file}`, ledger);
    await sql.unsafe("ALTER TABLE profile_customization DISABLE TRIGGER profile_card_browser_write_boundary");
    await assert.rejects(assertProfileCardReadiness(sql), /boundary/);
    await sql.unsafe("ALTER TABLE profile_customization ENABLE ALWAYS TRIGGER profile_card_browser_write_boundary");
    for (const mutation of [
      "GRANT EXECUTE ON FUNCTION guard_profile_card_browser_write() TO authenticated",
      "ALTER FUNCTION guard_profile_card_browser_write() SECURITY DEFINER",
      "ALTER FUNCTION guard_profile_card_browser_write() SET search_path = public",
      "CREATE OR REPLACE FUNCTION guard_profile_card_browser_write() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$ BEGIN RETURN NEW; END; $$",
    ]) {
      await assert.rejects(sql.begin(async tx => {
        await tx.unsafe(mutation);
        await assertProfileCardReadiness({ begin: async (mode, run) => {
          assert.equal(mode, "read only"); return run(tx);
        } });
      }), /incompatible|differs/);
      await assertProfileCardReadiness(sql);
    }
    // Actual SQL role, including a spoofed JWT service-role claim, protects both facts.
    for (const role of ["anon", "authenticated"]) for (const patch of ["profile_frame_id='frame-aurora'", "theme_primary='red'"]) await assert.rejects(sql.begin(async tx => {
      await tx.unsafe(`SET LOCAL ROLE ${role}`); await tx`select set_config('request.jwt.claim.sub',${user},true)`;
      await tx`select set_config('request.jwt.claims','{"role":"service_role"}',true)`;
      await tx.unsafe(`update profile_customization set ${patch} where user_id=$1`, [user]);
    }), { code: "42501" });
  } finally {
    if (sql) await sql.end(); await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); await admin.end();
  }
});

test("real PostgREST profile/card boundary and trusted Style mutation", options, async () => {
  loopback(); const sql=postgres(databaseUrl,{max:4,prepare:false});
  const schema='profile_card_test'; const user=crypto.randomUUID(); const other=crypto.randomUUID();
  const request=(role,method,body,filter='',prefer='return=representation',sub=user)=>fetch(`${restUrl}/profile_customization${filter}`,{
    method,headers:{Authorization:`Bearer ${jwt(role,sub)}`,'Content-Type':'application/json','Accept-Profile':schema,'Content-Profile':schema,Prefer:prefer},...(body?{body:JSON.stringify(body)}:{})});
  try {
    await ensureTestRoles(sql);
    await sql.unsafe(`CREATE SCHEMA ${schema}; GRANT USAGE ON SCHEMA ${schema} TO anon,authenticated,service_role;
      CREATE TABLE ${schema}.users(id uuid PRIMARY KEY); INSERT INTO ${schema}.users VALUES ('${user}'),('${other}');`);
    const fixture=JSON.parse(await readFile(new URL('../fixtures/commerce-base.json',import.meta.url),'utf8'));
    const table=fixture.tables.find(t=>t.name==='profile_customization');
    for(const [name,labels] of fixture.enums) await sql.unsafe(`CREATE TYPE ${schema}.${name} AS ENUM (${labels.map(l=>`'${l}'`).join(',')})`);
    await sql.unsafe(`CREATE TABLE ${schema}.profile_customization (${table.columns.map(c=>`${c[0]} ${c[1].replaceAll('public.',schema+'.')}${c[3]!==null?' DEFAULT '+c[3].replaceAll('public.',schema+'.'):''}${c[2]?'':' NOT NULL'}`).join(',')}, PRIMARY KEY(user_id));
      ALTER TABLE ${schema}.profile_customization ENABLE ROW LEVEL SECURITY;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ${schema}.profile_customization TO anon,authenticated,service_role;
      CREATE FUNCTION ${schema}.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT (nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''sub'')::uuid';`);
    for(const p of table.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON ${schema}.profile_customization FOR ${{r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE'}[p.command]} TO PUBLIC${p.using_expression?' USING ('+p.using_expression.replaceAll('auth.uid()',schema+'.uid()')+')':''}${p.check_expression?' WITH CHECK ('+p.check_expression.replaceAll('auth.uid()',schema+'.uid()')+')':''}`);
    for(const base of ['80-personal-plan-grant-foundation.sql','89-style-app-theme-write-boundary.sql','90-style-nickname-font-write-boundary.sql','91-style-nickname-effect-write-boundary.sql','92-style-nickname-color-write-boundary.sql',file]) await sql.unsafe((await sqlFile(base)).replaceAll('public.',schema+'.'));
    await sql.unsafe(`CREATE TABLE ${schema}.subscriptions(user_id uuid,tier text,started_at timestamptz,expires_at timestamptz);
      CREATE TABLE ${schema}.user_inventory(user_id uuid,item_id text);
      CREATE TABLE ${schema}.shop_items(id text,equip_slot text,equip_value text,requires_subscription text);
      GRANT SELECT ON ${schema}.subscriptions,${schema}.user_inventory,${schema}.shop_items TO service_role;
      INSERT INTO ${schema}.profile_customization(user_id) VALUES ('${user}'); NOTIFY pgrst, 'reload schema';`);
    for (const column of fixture.tables.find(t=>t.name==='shop_items').columns) {
      if (!['id','equip_slot','equip_value','requires_subscription'].includes(column[0])) await sql.unsafe(`ALTER TABLE ${schema}.shop_items ADD COLUMN ${column[0]} ${column[1].replaceAll('public.',schema+'.')}`);
    }
    await sql.unsafe("NOTIFY pgrst, 'reload schema'");
    let ready=false;
    for(let i=0;i<100;i++){const response=await request('service_role','PATCH',{nickname_color:null},`?user_id=eq.${user}`).catch(()=>null);if(response?.ok){ready=true;break}await new Promise(r=>setTimeout(r,200))} assert.ok(ready, await (await request('service_role','PATCH',{nickname_color:null},`?user_id=eq.${user}`)).text());
    const premium={profile_frame_id:'frame-custom',frame_color:'#123456',card_base_mode:'theme',theme_primary:'#123456',theme_accent:'#ABCDEF'};
    const free=[{profile_frame_id:null},{profile_frame_id:'frame-slate'},{profile_frame_id:'frame-glass'},
      {frame_color:null},{card_base_mode:'mirror'},{card_base_mode:null},{theme_primary:null},{theme_primary:'#0a0a0f'},{theme_accent:null},{theme_accent:'#7b3aed'}];
    const denied=[{profile_frame_id:'frame-custom'},{profile_frame_id:'frame-gold-glow'},{profile_frame_id:'frame-aurora'},{profile_frame_id:'store-frame'},
      {frame_color:'#123456'},{frame_color:'red'},{card_base_mode:'theme'},{card_base_mode:'plain'},{card_base_mode:'bad'},
      {theme_primary:'#123456'},{theme_primary:'red'},{theme_accent:'#123456'},{theme_accent:'red'},premium];
    for(const role of ['anon','authenticated']) {
      assert.ok((await request(role,'GET')).ok);
      for(const body of [{},...free]) {
        assert.ok((await request('service_role','PATCH',{profile_frame_id:null,frame_color:null,card_base_mode:'mirror',theme_primary:null,theme_accent:null},`?user_id=eq.${user}`)).ok);
        const inserted=await request(role,'POST',{user_id:other,...body},'','return=representation',other);assert.ok(inserted.ok,await inserted.text());
        await sql.unsafe(`DELETE FROM ${schema}.profile_customization WHERE user_id=$1`,[other]);
        const updated=await request(role,'PATCH',body,`?user_id=eq.${user}`);assert.ok(updated.ok,await updated.text());
      }
      for(const body of denied) for(const [method,payload,filter,prefer,sub] of [
        ['POST',{user_id:other,...body},'','return=representation',other],
        ['PATCH',body,`?user_id=eq.${user}`,'return=representation',user],
        ['POST',{user_id:user,...body},'?on_conflict=user_id','resolution=merge-duplicates,return=representation',user],
        ['POST',{user_id:user,...body},'?on_conflict=user_id','resolution=ignore-duplicates,return=representation',user],
      ]) {
        await request('service_role','PATCH',{profile_frame_id:null,frame_color:null,card_base_mode:'mirror',theme_primary:null,theme_accent:null},`?user_id=eq.${user}`);
        const response=await request(role,method,payload,filter,prefer,sub);assert.equal(response.status,403,await response.text());
      }
      assert.ok((await request('service_role','PATCH',premium,`?user_id=eq.${user}`)).ok);
      for(const body of [{avatar_data:{retained:true}},{...premium,avatar_data:{unchanged:true}}]){const response=await request(role,'PATCH',body,`?user_id=eq.${user}`);assert.ok(response.ok,await response.text())}
    }
    const requests=[];
    globalThis.styleTestAdmin=createClient('http://127.0.0.1:1','disposable-only',{db:{schema},auth:{persistSession:false},global:{fetch:async(url,options)=>{
      const target=new URL(url);target.pathname=target.pathname.replace('/rest/v1','');requests.push({path:target.pathname,method:options.method??'GET'});
      const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${jwt('service_role',user)}`);return fetch(restUrl+target.pathname+target.search,{...options,headers});
    }}});
    const {updateCustomization,getEquippedCustomization}=await import('../../src/server/services/customization.service.ts');
    const {clearExpiredSubscriptionCustomizationRest}=await import('../../src/server/data/subscription-rest.ts');
    const patch={profileFrameId:'frame-custom',frameColor:'#123456',cardBaseMode:'theme',themePrimary:'#123456',themeAccent:'#ABCDEF'};
    await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ($1,'full','card:full','2020-01-01','2099-01-01')`,[user]);
    for(const body of Object.entries(patch).map(([k,v])=>({[k]:v})))await assert.rejects(updateCustomization(user,body));
    let projection=await getEquippedCustomization(user);assert.equal(projection.savedProfileFrameId,'frame-custom');assert.equal(projection.effectiveProfileFrameId,null);assert.equal(projection.effectiveFrameColor,null);assert.equal(projection.effectiveCardBaseMode,'mirror');assert.equal(projection.effectiveThemePrimary,'#0A0A0F');
    await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ($1,'style','card:style','2020-01-01','2099-01-01')`,[user]);
    await updateCustomization(user,patch);assert.equal((await getEquippedCustomization(user)).effectiveFrameColor,'#123456');
    await sql.unsafe(`INSERT INTO ${schema}.user_inventory VALUES ($1,'wrong'),($1,'gated'),($1,'free')`,[user]);
    await sql.unsafe(`INSERT INTO ${schema}.shop_items VALUES ('wrong','avatar_ring_id','collision',null),('gated','profile_frame_id','gated-frame','plus'),('free','profile_frame_id','free-frame',null)`);
    for(const profileFrameId of ['unowned','collision','gated-frame'])await assert.rejects(updateCustomization(user,{profileFrameId}));
    await updateCustomization(user,{profileFrameId:'free-frame'});assert.equal((await getEquippedCustomization(user)).effectiveProfileFrameId,'free-frame');
    await sql.unsafe(`INSERT INTO ${schema}.subscriptions VALUES ($1,'plus','2020-01-01','2099-01-01')`,[user]);
    await updateCustomization(user,{profileFrameId:'gated-frame'});
    await sql.unsafe(`UPDATE ${schema}.subscriptions SET expires_at='2020-01-01' WHERE user_id=$1`,[user]);
    await sql.unsafe(`UPDATE ${schema}.personal_plan_grants SET revoked_at=now() WHERE source_reference='card:style'`);
    await clearExpiredSubscriptionCustomizationRest(user);assert.equal((await getEquippedCustomization(user)).savedProfileFrameId,null);
    await sql.unsafe(`UPDATE ${schema}.profile_customization SET profile_frame_id='frame-custom' WHERE user_id=$1`,[user]);
    await sql.unsafe(`INSERT INTO ${schema}.shop_items VALUES ('preset-collision','profile_frame_id','frame-custom','plus')`);
    await clearExpiredSubscriptionCustomizationRest(user);projection=await getEquippedCustomization(user);assert.equal(projection.savedProfileFrameId,'frame-custom');assert.equal(projection.savedFrameColor,'#123456');assert.equal(projection.savedCardBaseMode,'theme');assert.equal(projection.savedThemePrimary,'#123456');assert.equal(projection.savedThemeAccent,'#ABCDEF');
    await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ($1,'style','card:restored','2020-01-01','2099-01-01')`,[user]);
    assert.equal((await getEquippedCustomization(user)).effectiveProfileFrameId,'frame-custom');
    await updateCustomization(user,{profileFrameId:'frame-slate',frameColor:null,cardBaseMode:null,themePrimary:null,themeAccent:null});
    projection=await getEquippedCustomization(user);assert.equal(projection.savedProfileFrameId,'frame-slate');assert.equal(projection.effectiveCardBaseMode,'mirror');
    assert.ok(requests.filter(r=>r.method!=='GET').every(r=>['/profile_customization','/rpc/load_active_personal_plan_grants'].includes(r.path)));
  } finally {await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await sql.end()}
});
