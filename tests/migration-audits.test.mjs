import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REQUIRED_MIGRATIONS } from "../scripts/migration-manifest.mjs";
import { migrationChecksum } from "../scripts/migration-checksum.mjs";

const records = REQUIRED_MIGRATIONS.map((id) => ({ id, checksum: migrationChecksum(readFileSync(new URL(`../drizzle/${id}`, import.meta.url), "utf8")) }));
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
function audit(command, rows) {
  const postgresStub = moduleUrl(`export default function () {
    const sql = async (strings) => {
      if (!strings.raw) return strings;
      const query = strings.join(' ');
      if (/\\b(insert|update|delete|create|alter|drop)\\b/i.test(query)) throw new Error('Audit attempted mutation');
      if (query.includes('select id, checksum')) return ${JSON.stringify(rows)};
      if (query.includes('to_regclass')) return [{registry:'ledger',requestsTable:'requests',friendshipsTable:'friendships',sendRequest:'send',respondRequest:'respond',blockCleanup:'cleanup',charges:'charges',chargeResolver:'resolver',rootGuard:'guard',personalGrants:'grants',personalResolver:'resolver'}];
      if (query.includes('relreplident')) return [{replicaIdentity:'f'}];
      if (query.includes('pg_get_functiondef')) return [{directChatDefinition:'connection_request_scope privacy_scope_allows'}];
      if (query.includes('has_function_privilege')) return [];
      throw new Error('Unexpected query');
    };
    sql.end = async () => {};
    sql.begin = async (mode, run) => {
      if (mode !== 'read only') throw new Error('Core readiness requires read only');
      return run({unsafe: async source => {
        if (!/^-- BEGIN (CORE BASELINE|COMMERCE PREREQUISITE|COMMERCE BASE|WALLET LEDGER|PAYMENT FULFILLMENT) READ-ONLY VALIDATION/.test(source)) throw new Error('Unexpected validation block');
        if (/\\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE)\\s+(TABLE|TYPE|FUNCTION|POLICY|INTO|FROM|ON)\\b/i.test(source)) throw new Error('Audit attempted mutation');
      }});
    };
    return sql;
  }`);
  const preload = moduleUrl(`import {registerHooks} from 'node:module';
    registerHooks({resolve(specifier,context,next){return specifier==='postgres'?{url:${JSON.stringify(postgresStub)},shortCircuit:true}:next(specifier,context);}});
    globalThis.fetch = async (url, options) => {
      if (options.method && options.method !== 'GET') throw new Error('Audit attempted mutation');
      if (!String(url).includes('id=in.')) throw new Error('Ledger query must filter the manifest');
      return {ok:true,json:async()=>${JSON.stringify(rows)}};
    };`);
  return spawnSync(process.execPath, ["--import", preload, `scripts/${command}.mjs`], {
    encoding: "utf8", timeout: 5_000,
    env: { ...process.env, DIRECT_URL: "postgres://invalid.invalid/never", DATABASE_URL: "postgres://invalid.invalid/never",
      NEXT_PUBLIC_SUPABASE_URL: "http://invalid.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture" },
  });
}

test("pending and readiness audits accept matching immutable records and execute no mutations", () => {
  for (const command of ["check-pending-migrations", "check-migration-readiness"]) {
    const result = audit(command, records);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /registered|readiness passed/);
  }
});

test("pending reports absent records; readiness rejects missing required migration", () => {
  const pending = audit("check-pending-migrations", records.slice(1));
  assert.equal(pending.status, 0, pending.stderr);
  assert.match(pending.stdout, /Pending release migrations \(1\)/);
  const readiness = audit("check-migration-readiness", records.slice(1));
  assert.equal(readiness.status, 1);
  assert.match(readiness.stderr, /Missing required migrations/);
});

test("both read-only audits reject checksum drift, empty checksum and legacy detection", () => {
  for (const command of ["check-pending-migrations", "check-migration-readiness"]) {
    for (const checksum of ["wrong", "", "legacy-detected"]) {
      const result = audit(command, [{ ...records[0], checksum }, ...records.slice(1)]);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /Migration checksum mismatch/);
    }
  }
});
