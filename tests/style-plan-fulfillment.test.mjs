import "./helpers/style-plan-runtime.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

process.env.VOOPLE_ADMIN_USER_IDS = "10000000-0000-4000-8000-000000000001";
const { fulfillStylePlanGrant, revokeStylePlanGrant } = await import("../src/server/services/style-plan.service.ts");
const { createTRPCRouter } = await import("../src/server/trpc/init.ts");
const { adminStylePlanProcedures } = await import("../src/server/trpc/routers/admin-style-plan.ts");
const router = createTRPCRouter(adminStylePlanProcedures);
const user = process.env.VOOPLE_ADMIN_USER_IDS;
const other = "10000000-0000-4000-8000-000000000002";
const input = { userId: user, sourceReference: "trusted:style:1", validFrom: "2026-10-01T10:00:00.123456Z", validUntil: "2026-11-01T10:00:00.123457Z" };
const row = (patch = {}) => ({ id: "30000000-0000-4000-8000-000000000001", user_id: user, plan_kind: "style",
  source_reference: input.sourceReference, valid_from: input.validFrom, valid_until: input.validUntil,
  created_at: "2026-10-01T10:00:00.000001Z", revoked_at: null, ...patch });

function setup(responses) {
  const calls = [];
  globalThis.styleTestAdmin = createClient("http://127.0.0.1:1", "test-only", { auth: { persistSession: false }, global: {
    fetch: async (url, options) => {
      const parsed = new URL(url);
      assert.equal(parsed.pathname, "/rest/v1/personal_plan_grants", "No legacy or billing tables may be accessed");
      calls.push({ method: options.method, query: parsed.searchParams, body: options.body ? JSON.parse(options.body) : null });
      const response = responses.shift();
      assert.ok(response, "Unexpected database call");
      return new Response(JSON.stringify(response.data), { status: response.status ?? 200, headers: { "Content-Type": "application/json" } });
    },
  } });
  return calls;
}
const duplicate = { status: 409, data: { code: "23505", message: 'duplicate key value violates unique constraint "personal_plan_grants_source_reference_key"' } };

test("first fulfillment returns validated persisted facts and fixes kind to Style", async () => {
  const calls = setup([{ data: row() }]);
  const grant = await fulfillStylePlanGrant(input);
  assert.deepEqual(grant, { id: row().id, userId: user, planKind: "style", sourceReference: input.sourceReference,
    validFrom: input.validFrom, validUntil: input.validUntil, createdAt: row().created_at, revokedAt: null });
  assert.deepEqual(calls[0].body, { user_id: user, plan_kind: "style", source_reference: input.sourceReference, valid_from: input.validFrom, valid_until: input.validUntil });
});

test("UUID case, maximum source length and a one-microsecond interval retain exact facts", async () => {
  const facts = { ...input, sourceReference: "a".repeat(200), validUntil: "2026-10-01T10:00:00.123457Z" };
  const calls = setup([{ data: row({ source_reference: facts.sourceReference, valid_until: facts.validUntil }) }]);
  const grant = await fulfillStylePlanGrant({ ...facts, userId: user.toUpperCase() });
  assert.equal(grant.validUntil, facts.validUntil);
  assert.equal(calls[0].body.user_id, user);
  assert.equal(grant.sourceReference.length, 200);
});

test("exact replay, offset equivalents and revoked replay preserve every stored fact", async () => {
  for (const revoked_at of [null, "2026-10-02T00:00:00.123456Z"]) {
    const calls = setup([duplicate, { data: row({ revoked_at }) }]);
    const grant = await fulfillStylePlanGrant({ ...input, validFrom: "2026-10-01T12:00:00.123456+02:00" });
    assert.equal(grant.createdAt, row().created_at);
    assert.equal(grant.revokedAt, revoked_at);
    assert.deepEqual(calls.map((call) => call.method), ["POST", "GET"]);
  }
});

for (const [name, patch] of [["user", { user_id: other }], ["start", { valid_from: "2026-10-01T10:00:00.123455Z" }],
  ["end", { valid_until: "2026-11-01T10:00:00.123458Z" }], ["Full", { plan_kind: "full" }]]) {
  test(`conflicting ${name} replay fails without updates`, async () => {
    const calls = setup([duplicate, { data: row(patch) }]);
    await assert.rejects(fulfillStylePlanGrant(input), { code: "SOURCE_CONFLICT" });
    assert.deepEqual(calls.map((call) => call.method), ["POST", "GET"]);
  });
}

for (const [name, patch] of [["UUID", { userId: "bad" }], ["blank source", { sourceReference: "" }],
  ["spaces", { sourceReference: "   " }], ["padded source", { sourceReference: " padded" }],
  ["long source", { sourceReference: "a".repeat(201) }], ["date", { validFrom: "bad" }],
  ["infinity", { validUntil: "infinity" }], ["invalid calendar", { validFrom: "2026-02-30T00:00:00Z" }],
  ["nonfinite Date", { validFrom: new Date(NaN) }], ["precision loss", { validFrom: "2026-10-01T10:00:00.1234567Z" }],
  ["equal interval", { validUntil: input.validFrom }], ["reversed interval", { validUntil: "2026-01-01T00:00:00Z" }],
  ["arbitrary kind", { planKind: "full" }]]) {
  test(`invalid ${name} is rejected before persistence`, async () => {
    const calls = setup([]);
    await assert.rejects(fulfillStylePlanGrant({ ...input, ...patch }), { code: "INVALID_REQUEST" });
    assert.equal(calls.length, 0);
  });
}

test("only the named source unique violation is eligible for replay; integrity and transport failures fail closed", async () => {
  for (const [code, message, expected] of [["23503", "private FK details", "INTEGRITY_FAILURE"], ["23514", "check", "INTEGRITY_FAILURE"],
    ["23505", 'duplicate "personal_plan_grants_pkey"', "DATABASE_FAILURE"], ["PGRST000", "offline", "DATABASE_FAILURE"]]) {
    const calls = setup([{ status: 400, data: { code, message } }]);
    await assert.rejects(fulfillStylePlanGrant(input), { code: expected });
    assert.equal(calls.length, 1);
  }
  setup([duplicate, { data: null }]);
  await assert.rejects(fulfillStylePlanGrant(input), { code: "DATABASE_FAILURE" });
  for (const data of [null, {}, row({ created_at: "bad" }), row({ revoked_at: "infinity" })]) {
    setup([{ data }]); await assert.rejects(fulfillStylePlanGrant(input), { code: "DATABASE_FAILURE" });
  }
});

test("revocation is a Style-only conditional update using DB time; retry keeps original revocation", async () => {
  const revoked = row({ revoked_at: "2026-10-02T00:00:00.123456Z" });
  for (const responses of [[{ data: [revoked] }], [{ data: [] }, { data: revoked }]]) {
    const calls = setup(responses);
    const grant = await revokeStylePlanGrant({ sourceReference: input.sourceReference });
    assert.equal(grant.revokedAt, revoked.revoked_at);
    assert.deepEqual(calls[0].body, { revoked_at: "now" });
    assert.equal(calls[0].query.get("revoked_at"), "is.null");
    assert.equal(calls[0].query.get("plan_kind"), "eq.style");
    assert.equal(calls[0].query.get("source_reference"), `eq.${input.sourceReference}`);
  }
  setup([{ data: [] }, { data: null }]);
  await assert.rejects(revokeStylePlanGrant({ sourceReference: input.sourceReference }), { code: "NOT_FOUND" });
  setup([{ data: [] }, { data: row({ plan_kind: "full" }) }]);
  await assert.rejects(revokeStylePlanGrant({ sourceReference: input.sourceReference }), { code: "SOURCE_CONFLICT" });
  setup([]); await assert.rejects(revokeStylePlanGrant({ sourceReference: " padded " }), { code: "INVALID_REQUEST" });
});

test("verified ordinary user and anonymous cannot invoke lifecycle; configured admin can", async () => {
  const caller = (verified) => router.createCaller({ user: { id: user }, client: {}, getVerifiedUser: async () => verified });
  const calls = setup([]);
  for (const verified of [null, { id: other }]) {
    const code = verified ? "FORBIDDEN" : "UNAUTHORIZED";
    await assert.rejects(caller(verified).grantStylePlan(input), { code });
    await assert.rejects(caller(verified).revokeStylePlan({ sourceReference: input.sourceReference }), { code });
  }
  assert.equal(calls.length, 0);
  setup([{ data: row() }, { data: [row({ revoked_at: "2026-10-02T00:00:00Z" })] }]);
  const admin = caller({ id: user });
  assert.equal((await admin.grantStylePlan(input)).planKind, "style");
  assert.ok((await admin.revokeStylePlan({ sourceReference: input.sourceReference })).revokedAt);
  setup([{ status: 400, data: { code: "23503", message: "private database detail" } }]);
  await assert.rejects(admin.grantStylePlan(input), (error) => error.code === "BAD_REQUEST" && !error.message.includes("private"));
  setup([duplicate, { data: row({ plan_kind: "full" }) }]);
  await assert.rejects(admin.grantStylePlan(input), { code: "CONFLICT" });
  setup([{ data: [] }, { data: null }]);
  await assert.rejects(admin.revokeStylePlan({ sourceReference: input.sourceReference }), { code: "NOT_FOUND" });
});

test("admin router composes lifecycle procedures and the writer remains server-only", () => {
  const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(source("src/server/trpc/routers/admin.ts"), /\.\.\.adminStylePlanProcedures/);
  for (const path of ["src/server/services/style-plan.service.ts", "src/server/data/style-plan-grants-rest.ts"]) {
    assert.match(source(path), /import "server-only"/);
    assert.doesNotMatch(source(path), /subscriptions|group_charges|payment_intents|subscription_fulfillments|yookassa/i);
  }
});
