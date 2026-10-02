import "./helpers/style-plan-runtime.mjs";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/server/services/upload.service") return { shortCircuit: true,
    url: "data:text/javascript,export const resolvePublicMediaKey = () => { throw new Error('Unexpected upload'); };" };
  return next(specifier, context);
} });
const { getPersonalStyleAccess } = await import("../src/server/services/personal-style-access.service.ts");
const { updateCustomization, getEquippedCustomization } = await import("../src/server/services/customization.service.ts");
const { clearExpiredSubscriptionCustomizationRest } = await import("../src/server/data/subscription-rest.ts");
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
function setup({ legacy = null, grants = [], saved = "neon", error = null } = {}) {
  const row = { nickname_font: "serif", nickname_effect: saved, nickname_gradient: saved === "gradient", nickname_color: "#123456", frame_color: "#123456" }; const writes = []; const calls = [];
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

const { assertNicknameColorSelectionAllowed, resolveEffectiveNicknameColor } = await import('../src/lib/customization/nickname-color.ts');
const { FREE_NICKNAME_COLORS } = await import('../src/lib/customization/nickname-options.ts');
const { getAccountNicknameFont } = await import('../src/server/services/nickname-font.service.ts');
test('Store editor preview uses effective color while inventory matching retains the saved preference', () => {
  const editor = readFileSync(new URL('../src/components/customization/CustomizationEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /nicknameColor: equipped\.effectiveNicknameColor/);
  assert.doesNotMatch(editor, /nicknameColor: equipped\.nicknameColor/);
});
for (const [name, legacy, grants, allowed] of cases) test('color capability: '+name, async () => {
  const state=setup({legacy,grants});
  assert.equal((await getPersonalStyleAccess(user,now)).capabilities.selectCustomNicknameColor,allowed);
  const batch=await loadNicknameFontAccessRest([user],now);
  const row={id:user,username:'color',display_name:'Color',created_at:now.toISOString(),subscriptions:legacy,profile_customization:state.row};
  for(const view of [mapUserToAuthor(row,batch.get(user)),mapUserToProfile(row,{},batch.get(user))]) assert.equal(view.customization.displayName.color,allowed?'#123456':null);
  assert.equal(state.row.nickname_color,'#123456'); assert.deepEqual(state.writes,[]);
});
for(const color of [null,...FREE_NICKNAME_COLORS,...FREE_NICKNAME_COLORS.map(c=>c.toUpperCase())]) test('free selection replaces saved custom: '+color,async()=>{
  const state=setup(); await updateCustomization(user,{nicknameColor:color});
  assert.equal(state.row.nickname_color,color); assert.equal((await getEquippedCustomization(user)).effectiveNicknameColor,color);
});
for(const color of ['', '#abc', '#12345', '#1234567', '#zzzzzz','red',' #123456','#123456\n',123,{}]) test('invalid color rejected and fails closed: '+JSON.stringify(color),async()=>{
  const state=setup({grants:[grant()]}); assert.equal(resolveEffectiveNicknameColor(color,true),null);
  assert.throws(()=>assertNicknameColorSelectionAllowed(color,true)); await assert.rejects(updateCustomization(user,{nicknameColor:color})); assert.deepEqual(state.writes,[]);
  const caller=createTRPCRouter({customization:customizationRouter}).createCaller({client:{},getVerifiedUser:async()=>({id:user})});
  await assert.rejects(caller.customization.update({nicknameColor:color}),{code:'BAD_REQUEST'});
});
for(const color of ['#123456','#ABCDEF']) test('exact custom authorization and independent mixed capabilities: '+color,async()=>{
  const denied=setup(); await assert.rejects(updateCustomization(user,{nicknameColor:color})); assert.deepEqual(denied.writes,[]);
  const state=setup({grants:[grant()]}); await updateCustomization(user,{nicknameColor:color,nicknameFont:'mono',nicknameEffect:'gradient'});
  assert.equal(state.row.nickname_color,color); assert.equal(state.row.nickname_font,'mono'); assert.equal(state.row.nickname_gradient,true);
  assert.equal(state.calls.length,1); const self=await getAccountNicknameFont(user); assert.equal(self.effectiveNicknameColor,color);
  for(const patch of [{frameColor:'#123456'},{profileFrameId:'frame-aurora'},{cardBaseMode:'theme'},{themePrimary:'#123456'},{themeAccent:'#123456'},{bannerId:'not-owned'}]) await assert.rejects(updateCustomization(user,{nicknameColor:color,...patch}));
});
for(const grants of [[],[grant({valid_until:now.toISOString()})],[grant({revoked_at:now.toISOString()})]]) test('cleanup, self, editor and reads preserve retained color: '+JSON.stringify(grants),async()=>{
  const state=setup({grants}); await clearExpiredSubscriptionCustomizationRest(user);
  assert.equal(state.row.nickname_color,'#123456'); assert.equal(state.row.frame_color,null);
  const equipped=await getEquippedCustomization(user); assert.equal(equipped.savedNicknameColor,'#123456'); assert.equal(equipped.effectiveNicknameColor,null);
  assert.equal((await getAccountNicknameFont(user)).effectiveNicknameColor,null);
  assert.equal(customizationFromEquipped(equipped,mapUserToAuthor({username:'c',display_name:'C'}).customization).displayName.color,null);
  assert.ok(state.writes.every(p=>!('nickname_color' in p)));
  globalThis.styleTestAdmin.rpc=async()=>({data:[grant()],error:null}); assert.equal((await getEquippedCustomization(user)).effectiveNicknameColor,'#123456');
});
test('401 authors use the same bounded Style fact with three calls for all capabilities',async()=>{
  const state=setup({grants:[grant()]}); const ids=Array.from({length:401},(_,i)=>'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
  const access=await loadNicknameFontAccessRest([...ids,...ids],now);
  for(const id of ids) assert.equal(mapUserToAuthor({id,username:'c',display_name:'C',profile_customization:state.row},access.get(id)).customization.displayName.color,id===user?'#123456':null);
  assert.deepEqual(state.calls.map(c=>c.input.p_user_ids.length),[200,200,1]); assert.deepEqual(state.writes,[]);
});
test('new snapshots capture effective color; historical snapshots and nested reposts stay captured',async()=>{
  const row={id:user,username:'c',display_name:'C',profile_customization:{nickname_color:'#ABCDEF'}};
  const snapshot={kind:'appearance',scene:'midnight',customization:mapUserToAuthor(row,{evaluatedAt:now,activeStyleCoverage:true}).customization};
  assert.equal(mapUserToAuthor(row,{evaluatedAt:now,activeStyleCoverage:false}).customization.displayName.color,null);
  const before=structuredClone(snapshot); Object.freeze(snapshot.customization.displayName);
  const original={id:'original',author_id:user,state_snapshot:snapshot};
  globalThis.styleTestAdmin={from(){const query={select(){return query},in(){return query},order(){return query},then(resolve){resolve({data:[original],error:null})}};return query}};
  for(const activeStyleCoverage of [false,true,false]){
    const author=mapUserToAuthor(row,{evaluatedAt:now,activeStyleCoverage});
    const [nested]=await mapPostRowsWithReposts([{id:'repost',author_id:user,is_repost:true,original_post_id:'original'}],{authorById:new Map([[user,author]])});
    assert.equal(mapPostRow(original,author).appearance.customization.displayName.color,'#ABCDEF');
    assert.equal(nested.repost.target.appearance.customization.displayName.color,'#ABCDEF');
    for(const state_snapshot of [null,{thought:'status'}]) assert.equal(mapPostRow({state_snapshot},author).author.customization.displayName.color,activeStyleCoverage?'#ABCDEF':null);
  } assert.deepEqual(snapshot,before);
});
