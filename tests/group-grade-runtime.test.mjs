import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";
import { initTRPC, TRPCError } from "@trpc/server";

// Native Node type stripping runs the actual service, adapter and access module.
// Replace only external persistence and Next's server boundary for this process.
const root = fileURLToPath(new URL("../", import.meta.url));
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const adminUrl = moduleUrl("export const getAdminClient = () => globalThis.gradeTestAdmin;");
const initUrl = moduleUrl("export const protectedProcedure = globalThis.gradeTestProtectedProcedure;");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: moduleUrl("export {};"), shortCircuit: true };
    if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
    if (specifier === "../init" && context.parentURL?.endsWith("chat-group-grade.ts")) {
      return { url: initUrl, shortCircuit: true };
    }
    const candidate = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:")
        ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
    if (candidate && existsSync(`${candidate}.ts`)) {
      return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const t = initTRPC.create();
globalThis.gradeTestProtectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx });
});
const { getGroupGrade } = await import("../src/server/services/group-grade.service.ts");
const { loadActiveGroupChargesRest } = await import("../src/server/data/group-charges-rest.ts");
const { chatGroupGradeProcedures } = await import("../src/server/trpc/routers/chat-group-grade.ts");
const router = t.router(chatGroupGradeProcedures);
const group = "20000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
const section = "20000000-0000-4000-8000-000000000003";
const user = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-01T12:00:00Z");

function setup({ member = true, role = "member", sectionAccess = true, rows = [], error = null, type = "group" } = {}) {
  const reads = [];
  globalThis.gradeTestAdmin = {
    from(table) {
      reads.push(table);
      assert.ok(["chats", "chat_members", "chat_section_members"].includes(table));
      const filters = {};
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        async maybeSingle() {
          const data = table === "chats"
            ? { id: filters.id, type, parent_chat_id: filters.id === section ? group : null,
              group_visibility: "private", section_access_mode: filters.id === section ? "restricted" : "inherit" }
            : table === "chat_members" ? member ? { role } : null
              : sectionAccess ? { chat_id: section } : null;
          return { data, error: null };
        },
      };
      return query;
    },
    async rpc(name, input) {
      assert.equal(name, "load_active_group_charges");
      reads.push({ name, input });
      return { data: rows, error };
    },
  };
  return reads;
}

const charge = (index = 1, patch = {}) => ({
  id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  owner_user_id: user, root_group_id: group, origin: "standalone",
  valid_from: "2026-09-01T00:00:00Z", valid_until: "2026-11-01T00:00:00Z", revoked_at: null,
  ...patch,
});

test("authorized private Group members get Basic with no charges and no personal/Boost reads", async () => {
  const reads = setup();
  const result = await getGroupGrade(group, user, now);
  assert.equal(result.grade, "basic");
  assert.equal(result.activeChargeCount, 0);
  assert.equal(result.evaluatedAt, now.toISOString());
  assert.deepEqual(result.capabilities, {
    freeCore: { state: "active", reason: "free_core" },
    premiumBenefits: { state: "unconfigured", reason: "premium_policy_pending" },
  });
  assert.deepEqual(Object.keys(result).sort(), ["rootGroupId", "activeChargeCount", "grade", "evaluatedAt", "policyVersion", "capabilities"].sort());
  assert.equal(reads.at(-1).input.p_evaluated_at, result.evaluatedAt);
});

test("restricted section normalizes to its root only after section authorization", async () => {
  let reads = setup({ rows: [charge()] });
  assert.equal((await getGroupGrade(section, user, now)).rootGroupId, group);
  assert.equal(reads.at(-1).input.p_root_group_id, group);
  reads = setup({ sectionAccess: false });
  await assert.rejects(getGroupGrade(section, user, now), /selected|выбранным/);
  assert.ok(reads.every((read) => typeof read === "string"));
});

test("outsiders and DM contexts cannot read charge state", async () => {
  for (const config of [{ member: false }, { type: "direct" }]) {
    const reads = setup(config);
    await assert.rejects(getGroupGrade(group, user, now));
    assert.ok(reads.every((read) => typeof read === "string"));
  }
});

test("Grade and pending premium policy are identical across governance roles", async () => {
  for (const role of ["member", "admin", "owner"]) {
    setup({ role, rows: Array.from({ length: 5 }, (_, i) => charge(i + 1)) });
    const result = await getGroupGrade(group, user, now);
    assert.equal(result.grade, "grade_iii");
    assert.equal(result.capabilities.premiumBenefits.state, "unconfigured");
    assert.equal("role" in result, false);
  }
});

test("read errors, malformed/duplicate records and cross-Group charges never become Basic", async () => {
  setup({ error: { message: "database unavailable" } });
  await assert.rejects(getGroupGrade(group, user, now), /Unable to load/);
  for (const rows of [null, [charge(), charge()], [charge(1, { root_group_id: other })],
    [charge(1, { revoked_at: now.toISOString() })], [charge(1, { valid_until: now.toISOString() })],
    [charge(1, { valid_from: "2026-10-02T00:00:00Z" })], [charge(1, { root_group_id: null })]]) {
    setup({ rows });
    await assert.rejects(loadActiveGroupChargesRest(group, now));
  }
});

test("read-only API validates input, protects reads and strips private source data", async () => {
  setup({ rows: [charge(1, { source_reference: "private-reference", provider: "private-provider" })] });
  const caller = router.createCaller({ user: { id: user } });
  assert.equal((await caller.groupGrade({ chatId: group })).grade, "grade_i");
  assert.doesNotMatch(JSON.stringify(await caller.groupGrade({ chatId: group })), /private-reference|private-provider|owner_user_id/);
  await assert.rejects(caller.groupGrade({ chatId: "invalid" }), { code: "BAD_REQUEST" });
  await assert.rejects(caller.groupGrade({ chatId: group, activeChargeCount: 99 }), { code: "BAD_REQUEST" });
  await assert.rejects(router.createCaller({ user: null }).groupGrade({ chatId: group }), { code: "UNAUTHORIZED" });
  setup({ member: false });
  await assert.rejects(caller.groupGrade({ chatId: group }), { code: "FORBIDDEN" });
  setup({ error: { message: "db failed" } });
  await assert.rejects(caller.groupGrade({ chatId: group }), { code: "INTERNAL_SERVER_ERROR" });
  // The production router uses the existing protectedProcedure, not a new auth policy.
  const source = readFileSync(new URL("../src/server/trpc/routers/chat.ts", import.meta.url), "utf8");
  assert.match(source, /\.\.\.chatGroupGradeProcedures/);
});
