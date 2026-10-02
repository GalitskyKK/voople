import "./helpers/style-plan-runtime.mjs";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/server/services/upload.service") return { shortCircuit: true,
    url: "data:text/javascript,export const resolvePublicMediaKey = () => { throw new Error('Unexpected upload'); };" };
  return next(specifier, context);
} });
const { getPersonalStyleAccess } = await import("../src/server/services/personal-style-access.service.ts");
const { getAccountAppTheme } = await import("../src/server/services/app-theme.service.ts");
const { equipShopItem, updateCustomization, getEquippedCustomization } = await import("../src/server/services/customization.service.ts");
const { clearExpiredSubscriptionCustomizationRest } = await import("../src/server/data/subscription-rest.ts");
const { assertAppThemeSelectionAllowed, resolveEffectiveAppThemeId } = await import("../src/lib/app-themes.ts");
const { createTRPCRouter } = await import("../src/server/trpc/init.ts");
const { customizationRouter } = await import("../src/server/trpc/routers/customization.ts");
const user = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-02T00:00:00Z");
const grant = (patch = {}) => ({ id: "20000000-0000-4000-8000-000000000001", user_id: user,
  plan_kind: "style", valid_from: "2026-10-01T00:00:00Z", valid_until: "2099-11-01T00:00:00Z", revoked_at: null, ...patch });

function setup({ legacy = null, grants = [], saved = "violet", error = null, extra = {}, items = [], owned = [] } = {}) {
  const row = { app_theme_id: saved, ...extra }; const writes = []; const reads = [];
  globalThis.styleTestAdmin = {
    from(table) {
      assert.ok(["subscriptions", "profile_customization", "user_inventory", "shop_items"].includes(table), table);
      let update; let itemId;
      const query = { select() { return query; }, eq(field, value) { if (field === "id") itemId = value; return query; }, not() { return query; },
        update(value) { assert.equal(table, "profile_customization"); update = value; return query; },
        maybeSingle() { return query; }, then(resolve) {
          reads.push(table);
          if (update) { writes.push(update); Object.assign(row, update); }
          resolve({ data: table === "subscriptions" ? legacy : table === "profile_customization" ? row
            : table === "user_inventory" ? owned.map(item_id => ({ item_id })) : itemId ? items.find(i => i.id === itemId) ?? null : items, error });
        } };
      return query;
    },
    async rpc(name, input) {
      assert.equal(name, "load_active_personal_plan_grants"); reads.push(input);
      const at = new Date(input.p_evaluated_at);
      return { data: grants.filter(g => !g.revoked_at && new Date(g.valid_from) <= at && at < new Date(g.valid_until)), error };
    },
  };
  return { row, writes, reads };
}

const activeLegacy = { started_at: "2099-01-01", expires_at: "2099-12-01", tier: "plus" };
const expiredLegacy = { expires_at: now.toISOString() };
const cases = [
  ["neither", null, [], false], ["legacy", activeLegacy, [], true], ["Style", null, [grant()], true],
  ["both", activeLegacy, [grant()], true], ["expired Style", null, [grant({ valid_until: now.toISOString() })], false],
  ["revoked Style", null, [grant({ revoked_at: now.toISOString() })], false],
  ["before validFrom", null, [grant({ valid_from: "2026-10-03T00:00:00Z" })], false],
  ["exact validFrom", null, [grant({ valid_from: now.toISOString() })], true],
  ["exact validUntil", null, [grant({ valid_until: now.toISOString() })], false],
  ["Full only", null, [grant({ plan_kind: "full" })], false],
  ["expired legacy + Style", expiredLegacy, [grant()], true],
  ["legacy + expired Style", activeLegacy, [grant({ valid_until: now.toISOString() })], true],
];
for (const [name, legacy, grants, allowed] of cases) test(`capability matrix: ${name}`, async () => {
  const { reads, writes } = setup({ legacy, grants });
  const result = await getPersonalStyleAccess(user, now);
  assert.equal(result.capabilities.selectPaidAppTheme, allowed);
  assert.equal(result.evaluatedAt, now.toISOString());
  assert.equal(reads.find(r => typeof r === "object").p_evaluated_at, now.toISOString());
  assert.deepEqual(Object.keys(result).sort(), ["capabilities", "evaluatedAt", "policyVersion", "sources"]);
  assert.deepEqual(writes, []);
});
test("read errors and invalid timestamps fail as errors; legacy ignores future started_at", async () => {
  setup({ error: { message: "failure" } }); await assert.rejects(getPersonalStyleAccess(user, now));
  setup({ legacy: activeLegacy }); assert.equal((await getPersonalStyleAccess(user, now)).sources.activeLegacySubscription, true);
  await assert.rejects(getPersonalStyleAccess(user, new Date(NaN)));
});
for (const theme of [null, "void", "light"]) test(`free selection and projection: ${theme}`, () => {
  assert.doesNotThrow(() => assertAppThemeSelectionAllowed(theme, false));
  assert.equal(resolveEffectiveAppThemeId(theme, false), theme ?? "void");
});
test("unknown themes including empty strings rejected; all paid themes gated", () => {
  for (const theme of ["unknown", ""]) for (const allowed of [true, false]) assert.throws(() => assertAppThemeSelectionAllowed(theme, allowed));
  for (const theme of ["violet", "rose", "emerald", "gold"]) {
    assert.throws(() => assertAppThemeSelectionAllowed(theme, false));
    assert.doesNotThrow(() => assertAppThemeSelectionAllowed(theme, true));
    assert.equal(resolveEffectiveAppThemeId(theme, false), "void");
    assert.equal(resolveEffectiveAppThemeId(theme, true), theme);
  }
});
test("Style-only paid mutation; mixed legacy fields reject atomically before persistence", async () => {
  let state = setup({ grants: [grant()] }); await updateCustomization(user, { appThemeId: "rose" });
  assert.equal(state.row.app_theme_id, "rose");
  for (const patch of [{ nicknameEffect: "neon" }, { frameColor: "#123456" },
    { cardBaseMode: "theme" }, { themePrimary: "#123456" }, { themeAccent: "#123456" },
    { nicknameColor: "#123456" }, { bannerId: "not-owned" }]) {
    state = setup({ grants: [grant()] });
    await assert.rejects(updateCustomization(user, { appThemeId: "rose", ...patch }));
    assert.deepEqual(state.writes, []); assert.equal(state.row.app_theme_id, "violet");
  }
  state = setup({ legacy: activeLegacy });
  await updateCustomization(user, { appThemeId: "gold", nicknameFont: "serif", nicknameEffect: "neon", frameColor: "#123456", themePrimary: "#123456" });
  assert.equal(state.row.nickname_font, "serif"); assert.equal(state.row.app_theme_id, "gold");
});
test("downgrade reads preserve saved themes; restoration and explicit free replacement", async () => {
  for (const grants of [[], [grant({ valid_until: now.toISOString() })], [grant({ revoked_at: now.toISOString() })]]) {
    const state = setup({ grants, extra: { nickname_font: "serif" },
      items: [{ equip_slot: "app_theme_id", equip_value: "violet", requires_subscription: "plus" }] });
    await clearExpiredSubscriptionCustomizationRest(user);
    assert.equal(state.row.app_theme_id, "violet");
    const equipment = await getEquippedCustomization(user);
    assert.equal(equipment.savedAppThemeId, "violet"); assert.equal(equipment.effectiveAppThemeId, "void");
    const account = await getAccountAppTheme(user, now);
    assert.equal(account.savedAppThemeId, "violet"); assert.equal(account.effectiveAppThemeId, "void");
    assert.ok(state.writes.every(patch => !("app_theme_id" in patch)));
  }
  let state = setup({ grants: [grant()] }); assert.equal((await getAccountAppTheme(user, now)).effectiveAppThemeId, "violet");
  assert.deepEqual(state.writes, []);
  state = setup(); await updateCustomization(user, { appThemeId: "light" });
  assert.equal(state.row.app_theme_id, "light"); assert.equal((await getAccountAppTheme(user, now)).effectiveAppThemeId, "light");
});
test("self-only account projection rejects input, unauthenticated users and DB failures", async () => {
  const router = createTRPCRouter({ customization: customizationRouter });
  const caller = router.createCaller({ user: { id: "other" }, client: {}, getVerifiedUser: async () => ({ id: user }) });
  setup({ grants: [grant()] }); assert.equal((await caller.customization.accountTheme()).effectiveAppThemeId, "violet");
  await assert.rejects(caller.customization.accountTheme({ userId: user }), { code: "BAD_REQUEST" });
  await assert.rejects(router.createCaller({ client: {}, getVerifiedUser: async () => null }).customization.accountTheme(), { code: "UNAUTHORIZED" });
  setup({ error: { message: "private db details" } });
  await assert.rejects(caller.customization.accountTheme(), { code: "INTERNAL_SERVER_ERROR", message: "Не удалось загрузить тему аккаунта" });
});

test("Store theme equip uses Style but never overrides requires_subscription or ownership", async () => {
  const item = { id: "theme-violet", equip_slot: "app_theme_id", equip_value: "violet", requires_subscription: null };
  let state = setup({ grants: [grant()], items: [item], owned: [item.id] });
  await equipShopItem(user, item.id); assert.equal(state.writes.length, 1);
  state = setup({ grants: [grant()], items: [{ ...item, requires_subscription: "plus" }], owned: [item.id] });
  await assert.rejects(equipShopItem(user, item.id)); assert.deepEqual(state.writes, []);
  state = setup({ grants: [grant()], items: [item] });
  await assert.rejects(equipShopItem(user, item.id)); assert.deepEqual(state.writes, []);
  state = setup({ items: [item], owned: [item.id] });
  await assert.rejects(equipShopItem(user, item.id)); assert.deepEqual(state.writes, []);
});
