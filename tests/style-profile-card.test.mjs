import './helpers/style-plan-runtime.mjs';
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
registerHooks({ resolve(s,c,next) {
  if(s==='@/server/services/upload.service') return {shortCircuit:true,url:'data:text/javascript,export const resolvePublicMediaKey=()=>{throw new Error("Unexpected upload")};'};
  return next(s,c);
}});
const {getPersonalStyleAccess}=await import('../src/server/services/personal-style-access.service.ts');
const {updateCustomization,getEquippedCustomization}=await import('../src/server/services/customization.service.ts');
const {clearExpiredSubscriptionCustomizationRest}=await import('../src/server/data/subscription-rest.ts');
const {mapUserToAuthor,mapUserToProfile,mapPostRow}=await import('../src/server/mappers/profile.ts');
const {mapPostRowsWithReposts}=await import('../src/server/data/post-hydration.ts');
const {loadNicknameFontAccessRest}=await import('../src/server/data/nickname-font-access-rest.ts');
const {customizationFromEquipped}=await import('../src/components/profile/editor/profile-editor-customization.ts');
const helpers=await import('../src/lib/customization/profile-card-access.ts');
const {REQUIRED_MIGRATIONS,RELEASE_APPLY_ORDER}=await import('../scripts/migration-manifest.mjs');
const user='10000000-0000-4000-8000-000000000001', now=new Date('2026-10-12T00:00:00Z');
const grant=(patch={})=>({id:'20000000-0000-4000-8000-000000000001',user_id:user,plan_kind:'style',valid_from:'2020-01-01T00:00:00Z',valid_until:'2099-01-01T00:00:00Z',revoked_at:null,...patch});
const legacy={started_at:'2099-01-01T00:00:00Z',expires_at:'2099-12-01'};
const saved={profile_frame_id:'frame-custom',frame_color:'#123456',card_base_mode:'theme',theme_primary:'#123456',theme_accent:'#ABCDEF'};
const premium={profileFrameId:'frame-custom',frameColor:'#123456',cardBaseMode:'theme',themePrimary:'#123456',themeAccent:'#ABCDEF'};
const caps=['selectPremiumProfileFramePreset','selectCustomFrameColor','selectPremiumCardBaseMode','selectProfilePalette'];
function setup({subscription=null,grants=[],inventory=[],items=[],extra={}}={}){
  const row={...saved,...extra}, writes=[],calls=[];
  globalThis.styleTestAdmin={from(table){let patch,id; const q={select(){return q},eq(k,v){if(k==='id')id=v;return q},not(){return q},maybeSingle(){return q},
    update(p){assert.equal(table,'profile_customization');patch=p;return q},then(resolve){if(patch){writes.push(patch);Object.assign(row,patch)}
      resolve({data:table==='subscriptions'?subscription:table==='profile_customization'?row:table==='user_inventory'?inventory.map(item_id=>({item_id})):id?items.find(i=>i.id===id):items.filter(i=>i.requires_subscription),error:null})}};return q},
    async rpc(name,input){calls.push({name,input}); const at=new Date(input.p_evaluated_at);const active=grants.filter(g=>!g.revoked_at&&new Date(g.valid_from)<=at&&at<new Date(g.valid_until));
      return {data:name==='load_active_style_subjects'?active.filter(g=>g.plan_kind==='style'&&input.p_user_ids.includes(g.user_id)).map(g=>g.user_id):active,error:null}}};
  return {row,writes,calls};
}
const cases=[['none',null,[],false],['legacy',legacy,[],true],['Style',null,[grant()],true],['both',legacy,[grant()],true],
  ['expired',null,[grant({valid_until:now.toISOString()})],false],['revoked',null,[grant({revoked_at:now.toISOString()})],false],
  ['future',null,[grant({valid_from:'2026-10-13'})],false],['at start',null,[grant({valid_from:now.toISOString()})],true],
  ['at end',null,[grant({valid_until:now.toISOString()})],false],['Full only',null,[grant({plan_kind:'full'})],false]];
for(const cap of caps) for(const [name,subscription,grants,allowed] of cases) test(cap+': '+name,async()=>{
  const state=setup({subscription,grants});const access=await getPersonalStyleAccess(user,now);assert.equal(access.capabilities[cap],allowed);
  const batch=await loadNicknameFontAccessRest([user],now); const u={id:user,username:'card',display_name:'Card',subscriptions:subscription,profile_customization:state.row};
  for(const view of [mapUserToAuthor(u,batch.get(user)),mapUserToProfile(u,{},batch.get(user))]){
    assert.equal(view.customization.assets.frame?.id??null,allowed?'frame-custom':null);
    assert.equal(view.customization.cardBaseMode,allowed?'theme':'mirror');assert.equal(view.customization.themePrimary,allowed?'#123456':'#0A0A0F');
    assert.equal(view.customization.themeAccent,allowed?'#ABCDEF':'#7B3AED');
  } assert.deepEqual(state.row,saved);assert.deepEqual(state.writes,[]);
});
for(const [name,subscription,grants,allowed] of cases.filter(c=>!['at start','at end'].includes(c[0]))) test('mixed selection '+name,async()=>{
  const state=setup({subscription,grants}); if(allowed){await updateCustomization(user,premium);assert.equal(state.writes.length,1);assert.equal(state.calls.length,1)}
  else{await assert.rejects(updateCustomization(user,premium));assert.deepEqual(state.writes,[])}
});
for(const profileFrameId of [null,'frame-slate','frame-glass']) test('free frame replaces retained '+profileFrameId,async()=>{
  const s=setup();await updateCustomization(user,{profileFrameId});const eq=await getEquippedCustomization(user);assert.equal(eq.savedProfileFrameId,profileFrameId);assert.equal(eq.effectiveProfileFrameId,profileFrameId);assert.equal(s.row.frame_color,'#123456');
});
for(const profileFrameId of ['frame-custom','frame-gold-glow','frame-aurora']) test('premium frame restoration '+profileFrameId,async()=>{
  const s=setup({extra:{profile_frame_id:profileFrameId}});await clearExpiredSubscriptionCustomizationRest(user);assert.equal((await getEquippedCustomization(user)).effectiveProfileFrameId,null);
  globalThis.styleTestAdmin.rpc=async()=>({data:[grant()],error:null});assert.equal((await getEquippedCustomization(user)).effectiveProfileFrameId,profileFrameId);assert.deepEqual(s.writes,[]);
});
for(const field of ['frameColor','themePrimary','themeAccent']) for(const value of ['', '#abc','#zzzzzz','red','#123456\n',123,{}]) test('malformed '+field+' '+JSON.stringify(value),async()=>{
  const s=setup({grants:[grant()]});await assert.rejects(updateCustomization(user,{[field]:value}));assert.deepEqual(s.writes,[]);
});
for(const cardBaseMode of [null,'mirror','theme','plain','invalid']) test('card mode '+cardBaseMode,async()=>{
  assert.equal(helpers.resolveEffectiveCardBaseMode(cardBaseMode,false),'mirror');assert.equal(helpers.resolveEffectiveCardBaseMode(cardBaseMode,true),['theme','plain'].includes(cardBaseMode)?cardBaseMode:'mirror');
  setup();if(cardBaseMode==null||cardBaseMode==='mirror')await updateCustomization(user,{cardBaseMode});else await assert.rejects(updateCustomization(user,{cardBaseMode}));
});
for(const patch of [{frameColor:null},{themePrimary:null},{themeAccent:null},{themePrimary:null,themeAccent:null},{themePrimary:'#0a0a0f',themeAccent:'#7b3aed'}]) test('free reset/default '+JSON.stringify(patch),async()=>{setup();await updateCustomization(user,patch)});
test('malformed saved colors fail closed independently',()=>{
  assert.equal(helpers.resolveEffectiveFrameColor('red',true),null);assert.deepEqual(helpers.resolveEffectiveProfilePalette('red','#123456',true),{themePrimary:'#0A0A0F',themeAccent:'#123456'});
  assert.equal(helpers.resolveEffectiveProfileFrameId('store-frame',false),'store-frame');assert.equal(helpers.resolveEffectiveProfileFrameId({},true),null);
});
const item=(slot='profile_frame_id',gated=null)=>({id:'owned',equip_slot:slot,equip_value:'store-frame',requires_subscription:gated});
for(const [label,inventory,items,subscription,allowed] of [
  ['owned',['owned'],[item()],null,true],['unowned',[],[item()],null,false],['wrong slot',['owned'],[item('avatar_ring_id')],null,false],
  ['collision',['owned'],[item('banner'),{...item(),id:'unowned'}],null,false],['gated Style',['owned'],[item('profile_frame_id','plus')],null,false],
  ['gated legacy',['owned'],[item('profile_frame_id','plus')],legacy,true],['arbitrary',[],[],null,false]]) test('Store frame '+label,async()=>{
  const s=setup({inventory,items,subscription,grants:[grant()]});if(allowed)await updateCustomization(user,{profileFrameId:'store-frame'});else{await assert.rejects(updateCustomization(user,{profileFrameId:'store-frame'}));assert.deepEqual(s.writes,[])}
});
test('expiry preserves presets even on Store collisions; gated nonpreset cleanup stays',async()=>{
  let s=setup({items:[{...item('profile_frame_id','plus'),equip_value:'frame-custom'}]});await clearExpiredSubscriptionCustomizationRest(user);assert.deepEqual(s.row,saved);assert.deepEqual(s.writes,[]);
  s=setup({items:[item('profile_frame_id','plus')],extra:{profile_frame_id:'store-frame'}});await clearExpiredSubscriptionCustomizationRest(user);assert.equal(s.row.profile_frame_id,null);
  for(const field of ['frame_color','card_base_mode','theme_primary','theme_accent'])assert.equal(s.row[field],saved[field]);
});
test('Style mixed patch with legacy-only banner is atomic',async()=>{const s=setup({grants:[grant()]});await assert.rejects(updateCustomization(user,{...premium,bannerId:'unowned'}));assert.deepEqual(s.writes,[])});
test('equipment saved facts and editor preview separate; restoration and reset',async()=>{
  const s=setup(); const eq=await getEquippedCustomization(user);for(const [key,value] of Object.entries(premium)) assert.equal(eq[key],value);
  const fallback=mapUserToAuthor({username:'c',display_name:'C'}).customization; const preview=customizationFromEquipped(eq,fallback);assert.equal(preview.assets.frame,null);assert.equal(preview.cardBaseMode,'mirror');
  const refreshed=customizationFromEquipped({...eq,...Object.fromEntries(caps.map(c=>[c,true]))},fallback);assert.equal(refreshed.assets.frame.id,'frame-custom');assert.equal(refreshed.themePrimary,'#123456');
  globalThis.styleTestAdmin.rpc=async()=>({data:[grant()],error:null});const active=await getEquippedCustomization(user);assert.equal(active.effectiveFrameColor,'#123456');assert.equal(active.effectiveThemeAccent,'#ABCDEF');
  await updateCustomization(user,{profileFrameId:null,frameColor:null,cardBaseMode:'mirror',themePrimary:null,themeAccent:null});assert.equal(s.row.profile_frame_id,null);
});
test('401 subjects retain bounded three calls for all Style capabilities',async()=>{
  const s=setup({grants:[grant()]});const ids=Array.from({length:401},(_,i)=>'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
  const batch=await loadNicknameFontAccessRest([...ids,...ids],now);for(const id of ids){const view=mapUserToAuthor({id,username:'c',display_name:'C',profile_customization:s.row},batch.get(id));assert.equal(view.customization.assets.frame?.id??null,id===user?'frame-custom':null)}
  assert.deepEqual(s.calls.map(c=>c.input.p_user_ids.length),[200,200,1]);assert.deepEqual(s.writes,[]);
});
test('new effective snapshots, historical and nested reposts remain captured without mutation',async()=>{
  const s=setup();const row={id:user,username:'c',display_name:'C',profile_customization:s.row};const active=mapUserToAuthor(row,{evaluatedAt:now,activeStyleCoverage:true});
  const snapshot={kind:'appearance',scene:'midnight',customization:active.customization};const before=structuredClone(snapshot);Object.freeze(snapshot.customization);
  const original={id:'original',author_id:user,state_snapshot:snapshot};globalThis.styleTestAdmin={from(){const q={select(){return q},in(){return q},order(){return q},then(r){r({data:[original],error:null})}};return q}};
  for(const activeStyleCoverage of [false,true,false]){const author=mapUserToAuthor(row,{evaluatedAt:now,activeStyleCoverage});const [nested]=await mapPostRowsWithReposts([{id:'repost',author_id:user,is_repost:true,original_post_id:'original'}],{authorById:new Map([[user,author]])});
    for(const appearance of [mapPostRow(original,author).appearance,nested.repost.target.appearance]){assert.equal(appearance.customization.assets.frame.id,'frame-custom');assert.equal(appearance.customization.cardBaseMode,'theme');assert.equal(appearance.customization.themePrimary,'#123456')}
  }assert.deepEqual(snapshot,before);
});
test('required migration count and apply order are 52',()=>{assert.equal(REQUIRED_MIGRATIONS.length,52);assert.equal(RELEASE_APPLY_ORDER.length,52);assert.equal(REQUIRED_MIGRATIONS.at(-1),'93-style-profile-card-write-boundary.sql')});
