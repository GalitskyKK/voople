import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from '../scripts/migration-manifest.mjs';
import { groupRuntimeRpcValidationSql, assertGroupRuntimeRpcReadiness } from '../scripts/group-runtime-rpc-readiness.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/group-runtime-rpc.json',import.meta.url),'utf8'));
test('Group runtime scope, attested hashes and dependency order',()=>{
 assert.equal(REQUIRED_MIGRATIONS.length,49);
 assert.deepEqual(fixture.functions.map(f=>[f.signature,f.definition_md5_lf]),[
  ['public.accept_group_vanity_invite(character varying,uuid)','762d06821531d44069f819d2588da65b'],
  ['public.assign_group_boost_slot(uuid,smallint,uuid,uuid)','399ba680326626907d579c3c3619becc'],
 ]);
 for(const f of fixture.functions)assert.equal(createHash('md5').update(f.definition.replaceAll('\r\n','\n')).digest('hex'),f.definition_md5_lf);
 assert.equal(RELEASE_APPLY_ORDER[7],'88-group-runtime-rpc-compatibility.sql');assert.equal(RELEASE_APPLY_ORDER.at(-3),'81-legacy-commerce-rpc-privileges.sql');
 const source=readFileSync(new URL('../drizzle/88-group-runtime-rpc-compatibility.sql',import.meta.url),'utf8');
 assert.doesNotMatch(source,/CREATE TABLE|ALTER TABLE|CREATE OR REPLACE FUNCTION/);
 assert.deepEqual([...source.matchAll(/EXECUTE \$definition\$CREATE FUNCTION public\.(\w+)/g)].map(m=>m[1]),fixture.functions.map(f=>f.name));
});
test('Group readiness uses only authoritative catalog validation inside READ ONLY',async()=>{
 const validation=groupRuntimeRpcValidationSql();assert.doesNotMatch(validation,/DO \$create\$|EXECUTE \$definition\$|SELECT public\.(accept_group_vanity_invite|assign_group_boost_slot)\(/);
 let executed=false;await assertGroupRuntimeRpcReadiness({begin:async(mode,run)=>{assert.equal(mode,'read only');await run({unsafe:async source=>{assert.equal(source,validation);executed=true;}});}});assert.equal(executed,true);
});
