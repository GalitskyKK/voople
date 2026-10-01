import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertLegacyCommerceRpcPrivileges, LEGACY_COMMERCE_RPC_SIGNATURES } from "../scripts/legacy-commerce-rpc-privileges.mjs";

test("privilege migration targets exactly the six attested signatures without definitions or DML", () => {
  const source = readFileSync("drizzle/81-legacy-commerce-rpc-privileges.sql", "utf8");
  const signatures = [...source.matchAll(/'(public\.[a-z_]+\([^']*\))'/g)].map((m) => m[1]);
  assert.deepEqual(signatures, [...LEGACY_COMMERCE_RPC_SIGNATURES]);
  assert.match(source, /to_regprocedure\(v_signature\)/);
  assert.match(source, /IF v_function IS NOT NULL THEN/);
  assert.match(source, /REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION %s TO service_role/);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i);
});

test("readiness accepts service-only and missing legacy functions using SELECT only", async () => {
  for (const rows of [[], [{ signature: "fixture", anon_execute: false, authenticated_execute: false, public_execute: false, service_execute: true }]]) {
    const sql = async (strings) => {
      const source = strings.join(" ");
      assert.match(source, /has_function_privilege/);
      assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REVOKE|GRANT)\b/i);
      return rows;
    };
    assert.deepEqual(await assertLegacyCommerceRpcPrivileges(sql), rows);
  }
});

test("readiness rejects each browser/PUBLIC permission and lost service access", async () => {
  const safe = { signature: "fixture", anon_execute: false, authenticated_execute: false, public_execute: false, service_execute: true };
  for (const field of ["anon_execute", "authenticated_execute", "public_execute", "service_execute"]) {
    await assert.rejects(assertLegacyCommerceRpcPrivileges(async () => [{ ...safe, [field]: !safe[field] }]), /fixture.*81-legacy-commerce/);
  }
});
