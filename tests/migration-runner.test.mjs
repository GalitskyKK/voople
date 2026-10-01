import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyMigration, LEDGER_BOOTSTRAP, validateMigrationFilename } from "../scripts/migration-runner.mjs";
import { promoteReleaseMigrations } from "../scripts/migration-promotion.mjs";
import { RELEASE_APPLY_ORDER, REQUIRED_MIGRATIONS } from "../scripts/migration-manifest.mjs";
import { migrationChecksum } from "../scripts/migration-checksum.mjs";

const input = { file: REQUIRED_MIGRATIONS.at(-1), source: "CREATE TABLE fixture (id integer);\n--> statement-breakpoint\nCOMMENT ON TABLE fixture IS 'test';\n", releaseVersion: "1.2.3" };
function database({ ledger = true, records = [], failStatement = 0, failInsert = false, failCommit = false, version = 120000 } = {}) {
  const state = { ledger, records: new Map(records.map((row) => [row.id, row])), ddl: [], transactions: 0 };
  return { state, async begin(run) {
    state.transactions++;
    const draft = structuredClone(state);
    const tx = async (strings, ...values) => {
      const text = strings.join("?");
      if (text.includes("pg_advisory_xact_lock")) return [];
      if (text.includes("to_regclass")) return [{ registry: draft.ledger ? "app_schema_migrations" : null }];
      if (text.includes("server_version_num")) return [{ version }];
      if (text.includes("select checksum")) return draft.records.has(values[0]) ? [draft.records.get(values[0])] : [];
      if (text.includes("insert into public.app_schema_migrations")) {
        if (failInsert) throw Object.assign(new Error("ledger insert failed"), { code: "23505" });
        draft.records.set(values[0], { id: values[0], checksum: values[1], release_version: values[2], applied_at: "new" });
        return [];
      }
      assert.fail(`Unexpected query: ${text}`);
    };
    tx.unsafe = async (statement) => {
      draft.ddl.push(statement);
      if (draft.ddl.length === failStatement) throw Object.assign(new Error("conflicting object"), { code: "42P07" });
      draft.ledger = true;
    };
    const result = await run(tx);
    Object.assign(state, draft);
    if (failCommit) throw Object.assign(new Error("commit acknowledgement lost"), { code: "CONNECTION_CLOSED" });
    return result;
  } };
}

test("CLI rejects missing filename and historical SQL before any connection", () => {
  for (const args of [[], ["00-reset-partial-migration.sql"], ["12-shop-currency.sql"], ["25-commerce-hardening.sql"], ["shop-catalog-upsert.sql"], ["../escape.sql"], [input.file, input.file]]) {
    assert.throws(() => validateMigrationFilename(args));
    const result = spawnSync(process.execPath, ["scripts/apply-migration.mjs", ...args], { encoding: "utf8", timeout: 5_000,
      env: { ...process.env, DIRECT_URL: "postgres://invalid.invalid/never", DATABASE_URL: "postgres://invalid.invalid/never" } });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Directory replay is disabled|manifest-allowlisted/);
    assert.doesNotMatch(result.stderr, /ENOTFOUND|ECONNREFUSED/);
  }
});

test("pending migration commits all chunks and records once; matching apply preserves metadata", async () => {
  const sql = database();
  assert.equal((await applyMigration(sql, input)).status, "applied");
  assert.equal(sql.state.ddl.length, 2);
  const before = structuredClone(sql.state.records);
  assert.equal((await applyMigration(sql, { ...input, releaseVersion: "9.9.9" })).status, "already-applied");
  assert.equal(sql.state.ddl.length, 2);
  assert.deepEqual(sql.state.records, before);
});

test("checksum drift and legacy detection fail without DDL or record mutation", async () => {
  for (const checksum of ["wrong", "legacy-detected", ""]) {
    const record = { id: input.file, checksum, release_version: "pre-ledger", applied_at: "old" };
    const sql = database({ records: [record] });
    await assert.rejects(applyMigration(sql, input), /checksum mismatch|verified adoption/);
    assert.deepEqual(sql.state.ddl, []);
    assert.deepEqual(sql.state.records.get(input.file), record);
  }
});

test("CRLF-era ledger checksum skips replay", async () => {
  const checksum = createHash("sha256").update(input.source.replaceAll("\n", "\r\n")).digest("hex");
  const sql = database({ records: [{ id: input.file, checksum }] });
  assert.equal((await applyMigration(sql, input)).status, "already-applied");
  assert.deepEqual(sql.state.ddl, []);
});

test("unsupported PostgreSQL versions fail before executing pending SQL", async () => {
  const sql = database({ version: 110000 });
  await assert.rejects(applyMigration(sql, input), /PostgreSQL 12/);
  assert.deepEqual(sql.state.ddl, []);
});

test("duplicate DDL, mid-file failure and ledger failure roll back", async () => {
  for (const failure of [{ failStatement: 1 }, { failStatement: 2 }, { failInsert: true }]) {
    const sql = database(failure);
    await assert.rejects(applyMigration(sql, input));
    assert.equal(sql.state.transactions, 1);
    assert.equal(sql.state.records.size, 0);
    assert.deepEqual(sql.state.ddl, []);
  }
});

test("lost acknowledgement after commit is not replayed; later healthy application verifies the ledger", async () => {
  const sql = database({ failCommit: true });
  await assert.rejects(applyMigration(sql, input), { code: "CONNECTION_CLOSED" });
  assert.equal(sql.state.transactions, 1);
  assert.equal(sql.state.ddl.length, 2);
  assert.equal(sql.state.records.size, 1);
  const healthy = database({ records: [...sql.state.records.values()] });
  assert.equal((await applyMigration(healthy, input)).status, "already-applied");
  assert.deepEqual(healthy.state.ddl, []);
});

test("ledger absence permits only migration 45; bootstrap matching ledger is a no-op", async () => {
  const sql = database({ ledger: false });
  await assert.rejects(applyMigration(sql, input), /45-app-schema-migrations.sql first/);
  const bootstrap = { ...input, file: LEDGER_BOOTSTRAP };
  assert.equal((await applyMigration(sql, bootstrap)).status, "applied");
  assert.equal((await applyMigration(sql, bootstrap)).status, "already-applied");
  assert.equal(sql.state.records.get(LEDGER_BOOTSTRAP).checksum, migrationChecksum(input.source));
});

test("promoter verifies matching migrations and applies pending ones in manifest order before readiness", async () => {
  const sql = database({ records: RELEASE_APPLY_ORDER.slice(0, 3).map((id) => ({ id, checksum: migrationChecksum(input.source) })) });
  const order = [];
  await promoteReleaseMigrations({ apply: async (file) => { order.push(file); await applyMigration(sql, { ...input, file }); },
    backfill: async () => order.push("backfill"), readiness: async () => order.push("readiness") });
  assert.deepEqual(order, [...RELEASE_APPLY_ORDER, "backfill", "readiness"]);
  assert.equal(sql.state.ddl.length, (RELEASE_APPLY_ORDER.length - 3) * 2);
});

test("promotion stops on drift before any later migration, backfill or readiness", async () => {
  const order = [];
  await assert.rejects(promoteReleaseMigrations({ apply: async (file) => { order.push(file); throw new Error("checksum drift"); },
    backfill: async () => order.push("backfill"), readiness: async () => order.push("readiness") }), /checksum drift/);
  assert.deepEqual(order, [LEDGER_BOOTSTRAP]);
});

test("all required SQL is compatible with a single transaction on PostgreSQL 12+", () => {
  const enumFiles = [];
  for (const file of REQUIRED_MIGRATIONS) {
    const source = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:CREATE|DROP)\s+DATABASE\b|\b(?:CREATE|REINDEX|DROP)\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b|\bVACUUM\b|\bALTER\s+SYSTEM\b|^\s*(?:BEGIN|COMMIT|ROLLBACK)\s*;/im, file);
    if (/ALTER TYPE.*ADD VALUE/i.test(source)) enumFiles.push(file);
  }
  assert.deepEqual(enumFiles, ["58-room-invitations.sql", "77-friendships.sql"]);
});
