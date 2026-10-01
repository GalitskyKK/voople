import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const adminUrl = moduleUrl("export const getAdminClient = () => globalThis.personalTestAdmin;");
const dbUrl = moduleUrl("export const db = null;");
const clientUrl = moduleUrl('export const createClient = () => { throw new Error("Unexpected auth client creation"); };');
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: moduleUrl("export {};"), shortCircuit: true };
    if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
    if (specifier === "@/server/db") return { url: dbUrl, shortCircuit: true };
    if (specifier === "@/lib/supabase/server") return { url: clientUrl, shortCircuit: true };
    const candidate = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:") ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
    if (candidate && existsSync(`${candidate}.ts`)) return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { createTRPCRouter } = await import("../src/server/trpc/init.ts");
const { getPersonalPlanStatus } = await import("../src/server/services/personal-plan.service.ts");
const { shopPersonalPlanProcedures } = await import("../src/server/trpc/routers/shop-personal-plan.ts");
const router = createTRPCRouter(shopPersonalPlanProcedures);
const user = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-01T12:00:00Z");
const row = (index = 1, patch = {}) => ({ id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  user_id: user, plan_kind: "style", valid_from: "2026-09-01T00:00:00Z", valid_until: "2099-11-01T00:00:00Z", revoked_at: null, ...patch });
function setup(data = [], error = null) {
  const reads = [];
  globalThis.personalTestAdmin = {
    from() { assert.fail("Personal runtime must never read legacy subscriptions, charges or Boost tables"); },
    async rpc(name, input) { assert.equal(name, "load_active_personal_plan_grants"); reads.push({ name, input }); return { data, error }; },
  };
  return reads;
}

test("service resolves coverage from one validated self snapshot", async () => {
  for (const [rows, coverage] of [[[], { style: false, full: false }], [[row()], { style: true, full: false }],
    [[row(1, { plan_kind: "full" })], { style: false, full: true }],
    [[row(), row(2, { plan_kind: "full" })], { style: true, full: true }],
    [[row(), row(2)], { style: true, full: false }]]) {
    const reads = setup(rows);
    const result = await getPersonalPlanStatus(user, now);
    assert.deepEqual(result.coverage, coverage);
    assert.equal(result.simultaneousCoverage, coverage.style && coverage.full);
    assert.deepEqual(reads, [{ name: "load_active_personal_plan_grants", input: { p_user_id: user, p_evaluated_at: result.evaluatedAt } }]);
    assert.equal(result.evaluatedAt, now.toISOString());
  }
});

test("malformed, foreign, duplicate or inactive SQL snapshots never become no coverage", async () => {
  for (const data of [null, {}, [row(), row()], [row(1, { user_id: other })], [row(1, { id: "bad" })],
    [row(1, { plan_kind: "pro" })], [row(1, { valid_from: "bad" })], [row(1, { valid_until: "infinity" })],
    [row(1, { valid_until: "2026-08-01T00:00:00Z" })], [row(1, { revoked_at: "bad" })],
    [row(1, { revoked_at: now.toISOString() })], [row(1, { valid_until: now.toISOString() })],
    [row(1, { valid_from: "2026-10-02T00:00:00Z" })]]) {
    setup(data); await assert.rejects(getPersonalPlanStatus(user, now));
  }
  setup([], { message: "db failed" });
  await assert.rejects(getPersonalPlanStatus(user, now), /Unable to load/);
  const reads = setup();
  await assert.rejects(getPersonalPlanStatus("bad", now));
  await assert.rejects(getPersonalPlanStatus(user, new Date(NaN)));
  assert.equal(reads.length, 0);
});

test("self-only protected API rejects all client input and returns no private fields", async () => {
  const reads = setup([row(1, { source_reference: "private-source", provider: "private-provider", payment: "private-payment" })]);
  const caller = router.createCaller({ user: { id: other }, client: {}, getVerifiedUser: async () => ({ id: user }) });
  const result = await caller.personalPlanStatus();
  assert.deepEqual(Object.keys(result).sort(), ["coverage", "evaluatedAt", "policyVersion", "simultaneousCoverage"]);
  assert.doesNotMatch(JSON.stringify(result), /private-|user_id|source|payment|provider/);
  assert.equal(reads[0].input.p_user_id, user);
  for (const input of [{ userId: other }, {}, null]) await assert.rejects(caller.personalPlanStatus(input), { code: "BAD_REQUEST" });
  await assert.rejects(router.createCaller({ user: { id: user }, client: {}, getVerifiedUser: async () => null }).personalPlanStatus(), { code: "UNAUTHORIZED" });
  assert.equal(reads.length, 1);
  setup([], { message: "db failed" });
  await assert.rejects(caller.personalPlanStatus(), { code: "INTERNAL_SERVER_ERROR" });
});

test("production router composition preserves the legacy subscription query", () => {
  const source = readFileSync(resolve(root, "src/server/trpc/routers/shop.ts"), "utf8");
  assert.match(source, /\.\.\.shopPersonalPlanProcedures/);
  assert.match(source, /subscriptionStatus: protectedProcedure\.query\(async \(\{ ctx \}\) => \{\s*try \{\s*return await getSubscriptionStatus\(ctx\.user\.id\);/);
});

test("no existing consumer or billing/fulfillment module imports the dormant runtime", () => {
  const allowed = new Set(["src/types/personal-plan.ts", "src/lib/personal-plans/personal-plan.ts",
    "src/server/data/personal-plan-grants-rest.ts", "src/server/services/personal-plan.service.ts",
    "src/server/trpc/routers/shop-personal-plan.ts", "src/server/trpc/routers/shop.ts"]);
  function walk(directory, relative) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = resolve(directory, entry.name);
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(path, name);
      else if (/\.[cm]?[jt]sx?$/.test(name) && !allowed.has(name)) {
        assert.doesNotMatch(readFileSync(path, "utf8"), /personal-plan\.service|personal-plan-grants-rest|personal-plans\/personal-plan|personalPlanStatus/, name);
      }
    }
  }
  walk(resolve(root, "src"), "src");
  walk(resolve(root, "desktop/src"), "desktop/src");
  for (const file of ["src/server/data/personal-plan-grants-rest.ts", "src/server/services/personal-plan.service.ts"]) {
    assert.doesNotMatch(readFileSync(resolve(root, file), "utf8"), /subscriptions|group_charges|group.boost|\.from\(|\.insert\(|\.update\(/);
  }
});
