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
const { updateCustomization, getEquippedCustomization } = await import("../src/server/services/customization.service.ts");
const { clearExpiredSubscriptionCustomizationRest } = await import("../src/server/data/subscription-rest.ts");
const { assertNicknameFontSelectionAllowed, resolveEffectiveNicknameFont, NICKNAME_FONT_IDS } = await import("../src/lib/customization/nickname-font.ts");
const { loadNicknameFontAccessRest } = await import("../src/server/data/nickname-font-access-rest.ts");
const { mapUserToAuthor, mapUserToProfile, mapPostRow } = await import("../src/server/mappers/profile.ts");
const { mapPostRowsWithReposts } = await import("../src/server/data/post-hydration.ts");
const { customizationFromEquipped } = await import("../src/components/profile/editor/profile-editor-customization.ts");
const { createTRPCRouter } = await import("../src/server/trpc/init.ts");
const { customizationRouter } = await import("../src/server/trpc/routers/customization.ts");
const user = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-02T00:00:00Z");
const grant = patch => ({ id: "20000000-0000-4000-8000-000000000001", user_id: user,
  plan_kind: "style", valid_from: "2020-01-01T00:00:00Z", valid_until: "2099-01-01T00:00:00Z", revoked_at: null, ...patch });
const activeLegacy = { started_at: "2099-01-01", expires_at: "2099-12-01" };
function setup({ legacy = null, grants = [], saved = "serif", error = null } = {}) {
  const row = { nickname_font: saved }; const writes = []; const calls = [];
  globalThis.styleTestAdmin = {
    from(table) {
      assert.ok(["subscriptions", "profile_customization", "user_inventory", "shop_items"].includes(table));
      let update;
      const query = { select() { return query; }, eq() { return query; }, not() { return query; }, maybeSingle() { return query; },
        update(patch) { assert.equal(table, "profile_customization"); update = patch; return query; },
        then(resolve) { if (update) { writes.push(update); Object.assign(row, update); }
          resolve({ data: table === "subscriptions" ? legacy : table === "profile_customization" ? row : [], error }); } };
      return query;
    },
    async rpc(name, input) {
      calls.push({ name, input });
      const at = new Date(input.p_evaluated_at);
      const active = grants.filter(g => !g.revoked_at && new Date(g.valid_from) <= at && at < new Date(g.valid_until));
      if (name === "load_active_style_subjects") return { data: [...new Set(active.filter(g => g.plan_kind === "style" && input.p_user_ids.includes(g.user_id)).map(g => g.user_id))], error };
      assert.equal(name, "load_active_personal_plan_grants");
      return { data: active, error };
    },
  };
  return { row, writes, calls };
}
const cases = [
  ["none", null, [], false], ["legacy", activeLegacy, [], true], ["Style", null, [grant()], true],
  ["both", activeLegacy, [grant()], true], ["expired", null, [grant({ valid_until: now.toISOString() })], false],
  ["revoked", null, [grant({ revoked_at: now.toISOString() })], false],
  ["future", null, [grant({ valid_from: "2026-10-03T00:00:00Z" })], false],
  ["inclusive start", null, [grant({ valid_from: now.toISOString() })], true],
  ["exclusive end", null, [grant({ valid_until: now.toISOString() })], false],
  ["Full only", null, [grant({ plan_kind: "full" })], false],
];
for (const [name, legacy, grants, allowed] of cases) test(`font capability: ${name}`, async () => {
  const state = setup({ legacy, grants });
  const access = await getPersonalStyleAccess(user, now);
  assert.equal(access.capabilities.selectPremiumNicknameFont, allowed);
  assert.equal(access.capabilities.selectPaidAppTheme, allowed);
  const batch = await loadNicknameFontAccessRest([user], now);
  const row = { id: user, username: "font", display_name: "Font", created_at: now.toISOString(), subscriptions: legacy,
    profile_customization: state.row };
  for (const view of [mapUserToAuthor(row, batch.get(user)), mapUserToProfile(row, {}, batch.get(user))]) {
    assert.equal(view.customization.displayName.font, allowed ? "serif" : "sans");
  }
  assert.equal(state.row.nickname_font, "serif"); assert.deepEqual(state.writes, []);
});
for (const font of NICKNAME_FONT_IDS) test(`allowed enum and saved/effective policy: ${font}`, async () => {
  assert.equal(resolveEffectiveNicknameFont(font, true), font);
  assert.equal(resolveEffectiveNicknameFont(font, false), "sans");
  const free = font === "sans";
  const denied = setup();
  if (free) await updateCustomization(user, { nicknameFont: font });
  else { await assert.rejects(updateCustomization(user, { nicknameFont: font })); assert.deepEqual(denied.writes, []); }
  const allowed = setup({ grants: [grant()] });
  await updateCustomization(user, { nicknameFont: font }); assert.equal(allowed.row.nickname_font, font);
});
test("null/reset is free, invalid font rejected at service and transport", async () => {
  const state = setup(); await updateCustomization(user, { nicknameFont: null });
  assert.equal(state.row.nickname_font, "sans"); assert.equal(resolveEffectiveNicknameFont(null, true), "sans");
  for (const font of ["", "invalid"]) {
    assert.throws(() => assertNicknameFontSelectionAllowed(font, true));
    await assert.rejects(updateCustomization(user, { nicknameFont: font }));
  }
  const router = createTRPCRouter({ customization: customizationRouter });
  const caller = router.createCaller({ client: {}, getVerifiedUser: async () => ({ id: user }) });
  await assert.rejects(caller.customization.update({ nicknameFont: "invalid" }), { code: "BAD_REQUEST" });
});
for (const patch of [{ nicknameEffect: "neon" }, { nicknameColor: "#123456" }, { profileFrameId: "frame-aurora" },
  { frameColor: "#123456" }, { cardBaseMode: "theme" }, { themePrimary: "#123456" }, { themeAccent: "#123456" },
  { bannerId: "not-owned" }]) test(`Style font does not unlock mixed patch ${JSON.stringify(patch)}`, async () => {
  const state = setup({ grants: [grant()] });
  await assert.rejects(updateCustomization(user, { nicknameFont: "mono", ...patch }));
  assert.deepEqual(state.writes, []); assert.equal(state.row.nickname_font, "serif");
});
test("cleanup preserves saved font, restoration and explicit sans replacement", async () => {
  for (const grants of [[], [grant({ valid_until: now.toISOString() })], [grant({ revoked_at: now.toISOString() })]]) {
    const state = setup({ grants }); await clearExpiredSubscriptionCustomizationRest(user);
    const equipped = await getEquippedCustomization(user);
    assert.equal(equipped.savedNicknameFont, "serif"); assert.equal(equipped.effectiveNicknameFont, "sans");
    assert.ok(state.writes.every(patch => !("nickname_font" in patch)));
    assert.equal(customizationFromEquipped(equipped, mapUserToAuthor({ username: "font", display_name: "Font" }).customization).displayName.font, "sans");
  }
  const restored = setup({ grants: [grant()] });
  assert.equal((await getEquippedCustomization(user)).effectiveNicknameFont, "serif"); assert.deepEqual(restored.writes, []);
  const replaced = setup(); await updateCustomization(user, { nicknameFont: "sans" });
  assert.equal((await getEquippedCustomization(user)).savedNicknameFont, "sans"); assert.equal(replaced.row.nickname_font, "sans");
});
const historicalUser = { id: user, username: "u", display_name: "U", created_at: now.toISOString(),
  profile_customization: { nickname_font: "serif" } };
function appearanceSnapshot() {
  return { kind: "appearance", scene: "midnight", customization: mapUserToAuthor(historicalUser,
    { evaluatedAt: now, activeStyleCoverage: true }).customization };
}
for (const allowed of [false, true]) test(`historical serif remains captured with current access ${allowed}`, () => {
  const snapshot = appearanceSnapshot();
  const access = { evaluatedAt: now, activeStyleCoverage: allowed };
  const author = mapUserToAuthor(historicalUser, access);
  const view = mapPostRow({ state_snapshot: snapshot }, author);
  assert.equal(view.appearance.customization.displayName.font, "serif");
  assert.equal(view.author.customization.displayName.font, allowed ? "serif" : "sans");
  assert.equal(mapUserToProfile(historicalUser, {}, access).customization.displayName.font, allowed ? "serif" : "sans");
  assert.equal("selectPremiumNicknameFont" in author, false);
});
test("mapping historical appearance never mutates the snapshot", () => {
  const snapshot = appearanceSnapshot(); const before = structuredClone(snapshot);
  Object.freeze(snapshot.customization.displayName); Object.freeze(snapshot.customization); Object.freeze(snapshot);
  mapPostRow({ state_snapshot: snapshot }, mapUserToAuthor(historicalUser));
  assert.deepEqual(snapshot, before);
});
test("normal text and status authors continue to use current effective font", () => {
  for (const activeStyleCoverage of [false, true]) {
    const author = mapUserToAuthor(historicalUser, { evaluatedAt: now, activeStyleCoverage });
    for (const [state_snapshot, kind] of [[null, "text"], [{ thought: "A moment" }, "status"]]) {
      const view = mapPostRow({ text: "Hello", state_snapshot }, author);
      assert.equal(view.kind, kind);
      assert.equal(view.author.customization.displayName.font, activeStyleCoverage ? "serif" : "sans");
    }
  }
});
test("reposted appearance keeps historical font independently of current author", async () => {
  const snapshot = appearanceSnapshot(); const before = structuredClone(snapshot);
  const original = { id: "original", author_id: user, state_snapshot: snapshot };
  const repost = { id: "repost", author_id: user, is_repost: true, original_post_id: original.id };
  const writes = [];
  globalThis.styleTestAdmin = { from(table) {
    assert.ok(["posts", "post_hashtags", "post_media"].includes(table));
    const query = { select() { return query; }, in() { return query; }, order() { return query; },
      update(patch) { writes.push(patch); return query; },
      then(resolve) { resolve({ data: table === "posts" ? [original] : [], error: null }); } };
    return query;
  } };
  for (const activeStyleCoverage of [false, true]) {
    const author = mapUserToAuthor(historicalUser, { evaluatedAt: now, activeStyleCoverage });
    const [view] = await mapPostRowsWithReposts([repost], { authorById: new Map([[user, author]]) });
    assert.equal(view.repost.target.appearance.customization.displayName.font, "serif");
    assert.equal(view.repost.target.author.customization.displayName.font, activeStyleCoverage ? "serif" : "sans");
  }
  assert.deepEqual(snapshot, before); assert.deepEqual(writes, []);
});
for (const loss of ["expiry", "revocation"]) test(`Style ${loss} changes live author but never historical appearance`, async () => {
  const snapshot = appearanceSnapshot(); const before = structuredClone(snapshot);
  const lostGrant = loss === "expiry" ? grant({ valid_until: now.toISOString() }) : grant({ revoked_at: now.toISOString() });
  for (const [grants, font] of [[[grant()], "serif"], [[lostGrant], "sans"], [[grant()], "serif"]]) {
    const state = setup({ grants });
    const access = (await loadNicknameFontAccessRest([user], now)).get(user);
    const view = mapPostRow({ state_snapshot: snapshot }, mapUserToAuthor(historicalUser, access));
    assert.equal(view.author.customization.displayName.font, font);
    assert.equal(view.appearance.customization.displayName.font, "serif");
    assert.deepEqual(state.writes, []); assert.equal(state.row.nickname_font, "serif");
  }
  assert.deepEqual(snapshot, before);
});
test("bounded batches deduplicate subjects, use one timestamp and never issue per-row reads", async () => {
  const state = setup({ grants: [grant()] });
  const ids = Array.from({ length: 401 }, (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
  const access = await loadNicknameFontAccessRest([...ids, ...ids], now);
  assert.equal(access.size, 401); assert.equal(state.calls.length, 3);
  assert.deepEqual(state.calls.map(c => c.input.p_user_ids.length), [200, 200, 1]);
  assert.ok(state.calls.every(c => c.name === "load_active_style_subjects" && c.input.p_evaluated_at === now.toISOString()));
  assert.equal(access.get(user).activeStyleCoverage, true); assert.deepEqual(state.writes, []);
  state.calls.length = 0; await loadNicknameFontAccessRest([], now); assert.deepEqual(state.calls, []);
  setup({ error: { message: "failure" } }); await assert.rejects(loadNicknameFontAccessRest([user], now));
});
test("font self read rejects foreign input, unauthenticated access and safe database failures", async () => {
  const router = createTRPCRouter({ customization: customizationRouter });
  const caller = router.createCaller({ client: {}, getVerifiedUser: async () => ({ id: user }) });
  const state = setup({ grants: [grant()] });
  assert.equal((await caller.customization.accountNicknameFont()).effectiveNicknameFont, "serif");
  assert.deepEqual(state.writes, []);
  await assert.rejects(caller.customization.accountNicknameFont({ userId: user }), { code: "BAD_REQUEST" });
  await assert.rejects(router.createCaller({ client: {}, getVerifiedUser: async () => null }).customization.accountNicknameFont(), { code: "UNAUTHORIZED" });
  setup({ error: { message: "private database details" } });
  await assert.rejects(caller.customization.accountNicknameFont(), { code: "INTERNAL_SERVER_ERROR", message: "Не удалось загрузить шрифт имени" });
});
test("malformed, duplicate or foreign batch coverage never becomes a valid font capability", async () => {
  for (const data of [null, ["not-a-uuid"], [user, user], ["10000000-0000-4000-8000-000000000002"]]) {
    setup(); globalThis.styleTestAdmin.rpc = async () => ({ data, error: null });
    await assert.rejects(loadNicknameFontAccessRest([user], now));
  }
});
