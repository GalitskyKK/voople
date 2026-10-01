import assert from "node:assert/strict";
import test from "node:test";
import { ensureTestRoles } from "./integration/helpers/test-roles.mjs";

function harness(existing = {}, failure) {
  const calls = [];
  const tx = async (strings, ...values) => {
    const query = strings.join("?");
    calls.push({ query, values });
    if (query.includes("pg_advisory_xact_lock")) return [];
    assert.match(query,/from pg_roles/);
    return existing[values[0]] ? [existing[values[0]]] : [];
  };
  tx.unsafe = async query => {
    calls.push({ query });
    if (failure) throw failure;
  };
  return { calls, admin: { begin: async (mode, run) => {
    assert.equal(mode,"isolation level read committed");
    return run(tx);
  } } };
}

const canonical = bypass => ({ rolcanlogin:false,rolbypassrls:bypass,rolsuper:false,
  rolcreatedb:false,rolcreaterole:false,rolreplication:false });

test("shared role bootstrap locks before existence checks and creates only canonical missing roles", async () => {
  const { admin, calls } = harness({ anon:canonical(false) });
  await ensureTestRoles(admin);
  assert.match(calls[0].query,/pg_advisory_xact_lock\(8675309, 0\)/);
  assert.deepEqual(calls.filter(c => c.query.startsWith("CREATE")).map(c => c.query),[
    "CREATE ROLE authenticated NOLOGIN NOBYPASSRLS", "CREATE ROLE service_role NOLOGIN BYPASSRLS",
  ]);
});

test("compatible shared roles are adopted without alteration", async () => {
  const { admin, calls } = harness({ anon:canonical(false),authenticated:canonical(false),service_role:canonical(true) });
  await ensureTestRoles(admin);
  assert.equal(calls.filter(c => c.query.startsWith("CREATE")).length,0);
});

test("shared role bootstrap rejects incompatible role semantics without repair", async () => {
  for (const [name, drift] of [["anon",{rolbypassrls:true}],["authenticated",{rolcanlogin:true}],
    ["service_role",{rolbypassrls:false}],["anon",{rolsuper:true}]]) {
    const { admin, calls } = harness({[name]:{...canonical(name === "service_role"),...drift}});
    await assert.rejects(ensureTestRoles(admin),new RegExp(`Incompatible shared test role: ${name}`));
    assert.equal(calls.some(c => /ALTER|DROP/.test(c.query)),false);
  }
});

test("shared role bootstrap propagates genuine SQL failures unchanged, including unique violations", async () => {
  for (const code of ["42501","23505","XX000"]) {
    const failure = Object.assign(new Error("setup failed"),{code});
    await assert.rejects(ensureTestRoles(harness({},failure).admin),error => error === failure);
  }
});
