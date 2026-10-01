import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

import { applyMigration, validateMigrationFilename } from "./migration-runner.mjs";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const source of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = source.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (!process.env[key]) process.env[key] = line.slice(separator + 1).trim();
  }
}

async function main() {
  // Reject directory replay and non-release SQL before loading credentials or connecting.
  const file = validateMigrationFilename(process.argv.slice(2));
  const source = readFileSync(resolve("drizzle", file), "utf8");
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Migration application requires DIRECT_URL or DATABASE_URL.");
  const releaseVersion = process.env.RELEASE_VERSION?.trim()
    || JSON.parse(readFileSync(resolve("desktop/package.json"), "utf8")).version;
  const sql = postgres(url, {
    max: 1, prepare: false, connect_timeout: 30, idle_timeout: 5, ssl: "require",
    connection: { application_name: "voople_migration_apply", statement_timeout: 60_000, lock_timeout: 5_000 },
  });
  const deadline = setTimeout(() => {
    console.error("Migration deadline exceeded; commit state may be unknown. Verify the ledger before retrying; no automatic replay.");
    process.exit(1);
  }, 120_000);
  try {
    const result = await applyMigration(sql, { file, source, releaseVersion });
    console.log(`${file}: ${result.status === "already-applied" ? "already applied (checksum verified; no SQL replay)" : "applied and recorded atomically"}.`);
  } finally {
    clearTimeout(deadline);
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(`Migration application failed: ${error.message}`);
  console.error("No automatic DDL retry. For connection/commit failures, verify the ledger on a healthy connection before retrying.");
  process.exitCode = 1;
});
