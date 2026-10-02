import "../helpers/style-plan-runtime.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
const restUrl = process.env.VOOPLE_TEST_POSTGREST_URL?.trim();
if (process.env.CI && (!databaseUrl || !restUrl)) throw new Error("CI requires disposable PostgreSQL and PostgREST; no skipped lifecycle tests");
test("Style lifecycle through real PostgREST, PostgreSQL constraints and server services", {
  skip: databaseUrl && restUrl ? false : "Dedicated PostgreSQL and PostgREST URLs are required; production is never used",
  timeout: 90_000,
}, async (t) => {
  for (const url of [databaseUrl, restUrl]) {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) throw new Error("Loopback test services required");
  }
  const schema = "style_fulfillment_test";
  const serviceRole = "style_fulfillment_service";
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const roles = { anon: `style_anon_${suffix}`, authenticated: `style_auth_${suffix}`, service_role: serviceRole };
  const sql = postgres(databaseUrl, { max: 8, prepare: false });
  const user = crypto.randomUUID();
  const other = crypto.randomUUID();
  const base = { userId: user, sourceReference: "integration:style", validFrom: "2026-10-01T10:00:00.123456Z", validUntil: "2026-11-01T10:00:00.123457Z" };
  const stored = async (source) => {
    const [{ row }] = await sql.unsafe(`SELECT row_to_json(g) AS row FROM "${schema}".personal_plan_grants g WHERE source_reference = $1`, [source]);
    return row;
  };
  const count = async (source) => (await sql.unsafe(`SELECT count(*)::integer AS n FROM "${schema}".personal_plan_grants WHERE source_reference = $1`, [source]))[0].n;
  try {
    for (const [kind, role] of Object.entries(roles)) await sql.unsafe(`CREATE ROLE "${role}" NOLOGIN ${kind === "service_role" ? "BYPASSRLS" : "NOBYPASSRLS"}`);
    await sql.unsafe(`CREATE SCHEMA "${schema}"; CREATE TABLE "${schema}".users(id uuid PRIMARY KEY)`);
    await sql.unsafe(`GRANT USAGE ON SCHEMA "${schema}" TO ${Object.values(roles).map((role) => `"${role}"`).join(",")}`);
    let migration = (await readFile(new URL("../../drizzle/80-personal-plan-grant-foundation.sql", import.meta.url), "utf8")).replaceAll("public.", `"${schema}".`);
    for (const [kind, role] of Object.entries(roles)) migration = migration.replaceAll(new RegExp(`\\b${kind}\\b`, "g"), `"${role}"`);
    await sql.unsafe(migration);
    await sql.unsafe(`INSERT INTO "${schema}".users VALUES ($1), ($2)`, [user, other]);
    // These canaries reject accidental dual writes and let us verify unchanged facts.
    for (const table of ["subscriptions", "group_charges", "payment_intents", "subscription_fulfillments"]) {
      await sql.unsafe(`CREATE TABLE "${schema}".${table}(id integer PRIMARY KEY); INSERT INTO "${schema}".${table} VALUES (1)`);
    }
    await sql.unsafe("NOTIFY pgrst, 'reload schema'");
    const requests = [];
    globalThis.styleTestAdmin = createClient("http://127.0.0.1:1", "disposable-test-only", {
      db: { schema }, auth: { persistSession: false }, global: { fetch: async (url, options) => {
        const path = new URL(url).pathname;
        requests.push(path);
        assert.ok(path === "/rest/v1/personal_plan_grants" || path === "/rest/v1/rpc/load_active_personal_plan_grants", path);
        // PostgREST is mounted at / in the disposable container, Supabase at /rest/v1.
        const destination = new URL(url);
        destination.pathname = path.replace("/rest/v1", "");
        // The disposable REST server assumes only the dedicated service test role.
        // No JWT secrets or real Supabase credentials are used by this fixture.
        const headers = new Headers(options.headers);
        headers.delete("Authorization");
        return fetch(`${restUrl}${destination.pathname}${destination.search}`, { ...options, headers });
      } },
    });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const response = await fetch(`${restUrl}/personal_plan_grants?select=id`, { headers: { "Accept-Profile": schema } }).catch(() => null);
      if (response?.ok) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(ready, "PostgREST schema cache did not become ready");
    const { fulfillStylePlanGrant, revokeStylePlanGrant } = await import("../../src/server/services/style-plan.service.ts");
    const { getPersonalPlanStatus } = await import("../../src/server/services/personal-plan.service.ts");
    const { personalPlanInstant } = await import("../../src/lib/personal-plans/timestamp.ts");
    const { createTRPCRouter } = await import("../../src/server/trpc/init.ts");
    const { shopPersonalPlanProcedures } = await import("../../src/server/trpc/routers/shop-personal-plan.ts");
    const self = createTRPCRouter(shopPersonalPlanProcedures).createCaller({ user: { id: other }, client: {}, getVerifiedUser: async () => ({ id: user }) });

    await t.test("created facts match persisted timestamps; equivalent offsets and microseconds replay exactly", async () => {
      const grant = await fulfillStylePlanGrant(base);
      const original = await stored(base.sourceReference);
      assert.equal(grant.id, original.id);
      assert.equal(grant.createdAt, original.created_at);
      assert.equal(personalPlanInstant(grant.validFrom), personalPlanInstant(base.validFrom));
      assert.equal(personalPlanInstant(grant.validUntil), personalPlanInstant(base.validUntil));
      assert.deepEqual(await fulfillStylePlanGrant(base), grant);
      assert.deepEqual(await fulfillStylePlanGrant({ ...base, validFrom: "2026-10-01T12:00:00.123456+02:00" }), grant);
      assert.deepEqual(await stored(base.sourceReference), original);
      assert.equal(await count(base.sourceReference), 1);
      for (const patch of [{ userId: other }, { validFrom: "2026-10-01T10:00:00.123455Z" }, { validUntil: "2026-11-01T10:00:00.123458Z" }]) {
        await assert.rejects(fulfillStylePlanGrant({ ...base, ...patch }), { code: "SOURCE_CONFLICT" });
        assert.deepEqual(await stored(base.sourceReference), original);
      }
    });
    await t.test("real FK failures do not create rows or become replay success", async () => {
      const sourceReference = "integration:missing-user";
      await assert.rejects(fulfillStylePlanGrant({ ...base, sourceReference, userId: crypto.randomUUID() }), { code: "INTEGRITY_FAILURE" });
      assert.equal(await count(sourceReference), 0);
    });
    await t.test("half-open coverage retains exact submillisecond windows and self-only status", async () => {
      assert.deepEqual((await getPersonalPlanStatus(user, new Date("2026-10-01T10:00:00.123Z"))).coverage, { style: false, full: false });
      assert.deepEqual((await getPersonalPlanStatus(user, new Date("2026-10-01T10:00:00.124Z"))).coverage, { style: true, full: false });
      const precise = { ...base, sourceReference: "integration:micro-window", validFrom: "2026-12-01T10:00:00.123999Z", validUntil: "2026-12-01T10:00:00.124001Z" };
      await fulfillStylePlanGrant(precise);
      assert.equal((await getPersonalPlanStatus(user, new Date("2026-12-01T10:00:00.124Z"))).coverage.style, true);
      const boundary = { ...base, sourceReference: "integration:boundary", validFrom: "2099-01-01T00:00:00Z", validUntil: "2099-02-01T00:00:00Z" };
      await fulfillStylePlanGrant(boundary);
      assert.equal((await getPersonalPlanStatus(user, new Date(boundary.validFrom))).coverage.style, true);
      assert.equal((await getPersonalPlanStatus(user, new Date(boundary.validUntil))).coverage.style, false);
      // Current date is deliberately irrelevant: issue an active fact for the real self API.
      await fulfillStylePlanGrant({ ...base, sourceReference: "integration:self", validFrom: "2000-01-01T00:00:00Z", validUntil: "2090-01-01T00:00:00Z" });
      assert.deepEqual((await self.personalPlanStatus()).coverage, { style: true, full: false });
      await assert.rejects(self.personalPlanStatus({ userId: other }), { code: "BAD_REQUEST" });
      await revokeStylePlanGrant({ sourceReference: "integration:self" });
    });
    await t.test("concurrent identical fulfillment returns one unchanged physical and logical grant", async () => {
      for (let i = 0; i < 5; i++) {
        const facts = { ...base, sourceReference: `integration:identical:${i}` };
        const [first, second] = await Promise.all([fulfillStylePlanGrant(facts), fulfillStylePlanGrant(facts)]);
        assert.deepEqual(first, second);
        assert.equal(await count(facts.sourceReference), 1);
      }
    });
    await t.test("concurrent conflicting fulfillment accepts one immutable fact and rejects the other", async () => {
      for (let i = 0; i < 5; i++) {
        const facts = { ...base, sourceReference: `integration:conflicting:${i}` };
        const results = await Promise.allSettled([fulfillStylePlanGrant(facts), fulfillStylePlanGrant({ ...facts, userId: other })]);
        const winner = results.find((result) => result.status === "fulfilled").value;
        assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
        assert.equal(results.find((result) => result.status === "rejected").reason.code, "SOURCE_CONFLICT");
        assert.equal((await stored(facts.sourceReference)).user_id, winner.userId);
        assert.equal(await count(facts.sourceReference), 1);
      }
    });
    await t.test("concurrent and repeated revocations preserve DB time and every immutable field", async () => {
      const original = await stored(base.sourceReference);
      const before = (await sql`SELECT to_json(clock_timestamp()) AS instant`)[0].instant;
      const revoked = await Promise.all(Array.from({ length: 8 }, () => revokeStylePlanGrant({ sourceReference: base.sourceReference })));
      const after = (await sql`SELECT to_json(clock_timestamp()) AS instant`)[0].instant;
      assert.ok(revoked.every((grant) => grant.revokedAt === revoked[0].revokedAt));
      assert.ok(personalPlanInstant(revoked[0].revokedAt) >= personalPlanInstant(before));
      assert.ok(personalPlanInstant(revoked[0].revokedAt) <= personalPlanInstant(after));
      const persisted = await stored(base.sourceReference);
      assert.deepEqual({ ...persisted, revoked_at: null }, original);
      assert.deepEqual(await fulfillStylePlanGrant(base), revoked[0]);
      assert.deepEqual(await revokeStylePlanGrant({ sourceReference: base.sourceReference }), revoked[0]);
      assert.equal(await count(base.sourceReference), 1);
      // Revoke the other independent Style facts so coverage must disappear.
      const sources = await sql.unsafe(`SELECT source_reference FROM "${schema}".personal_plan_grants WHERE user_id = $1 AND plan_kind = 'style'`, [user]);
      for (const row of sources) await revokeStylePlanGrant({ sourceReference: row.source_reference });
      assert.deepEqual((await getPersonalPlanStatus(user, new Date("2026-10-02T00:00:00Z"))).coverage, { style: false, full: false });
    });
    await t.test("missing source is not found and existing Full cannot be fulfilled or revoked by Style", async () => {
      await assert.rejects(revokeStylePlanGrant({ sourceReference: "integration:missing" }), { code: "NOT_FOUND" });
      await sql.unsafe(`INSERT INTO "${schema}".personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ($1,'full',$2,$3,$4)`, [user, "integration:full", base.validFrom, base.validUntil]);
      const original = await stored("integration:full");
      await assert.rejects(fulfillStylePlanGrant({ ...base, sourceReference: "integration:full" }), { code: "SOURCE_CONFLICT" });
      await assert.rejects(revokeStylePlanGrant({ sourceReference: "integration:full" }), { code: "SOURCE_CONFLICT" });
      assert.deepEqual(await stored("integration:full"), original);
      await fulfillStylePlanGrant({ ...base, sourceReference: "integration:overlap" });
      const status = await getPersonalPlanStatus(user, new Date("2026-10-02T00:00:00Z"));
      assert.deepEqual(status.coverage, { style: true, full: true });
      assert.equal(status.simultaneousCoverage, true);
    });
    await t.test("actual anon and authenticated INSERT, UPDATE and DELETE are denied", async () => {
      for (const role of [roles.anon, roles.authenticated]) {
        for (const statement of [
          `INSERT INTO "${schema}".personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ('${user}','style','browser','2026-01-01','2027-01-01')`,
          `UPDATE "${schema}".personal_plan_grants SET revoked_at=now()`,
          `DELETE FROM "${schema}".personal_plan_grants`,
        ]) await assert.rejects(sql.begin(async (tx) => { await tx.unsafe(`SET LOCAL ROLE "${role}"`); await tx.unsafe(statement); }), { code: "42501" });
      }
    });
    await t.test("fulfillment and revocation leave legacy, payment and charge canaries unchanged", async () => {
      for (const table of ["subscriptions", "group_charges", "payment_intents", "subscription_fulfillments"]) {
        assert.deepEqual([...(await sql.unsafe(`SELECT * FROM "${schema}".${table}`))], [{ id: 1 }]);
      }
      assert.ok(requests.length > 20);
    });
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    for (const role of Object.values(roles)) await sql.unsafe(`DROP ROLE IF EXISTS "${role}"`);
    await sql.end();
  }
});
