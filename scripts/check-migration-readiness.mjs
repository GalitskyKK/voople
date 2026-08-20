import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import postgres from "postgres";

import { REQUIRED_MIGRATIONS } from "./migration-manifest.mjs";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const source of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = source.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Migration readiness requires DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 30,
  idle_timeout: 5,
  ssl: "require",
});

try {
  const [{ registry }] = await sql`
    select to_regclass('public.app_schema_migrations')::text as registry
  `;
  if (!registry) throw new Error("app_schema_migrations is missing; apply 45-app-schema-migrations.sql");

  const rows = await sql`
    select id, checksum, release_version, applied_at
    from public.app_schema_migrations
    where id in ${sql(REQUIRED_MIGRATIONS)}
  `;
  const applied = new Set(rows.map((row) => row.id));
  const missing = REQUIRED_MIGRATIONS.filter((id) => !applied.has(id));
  if (missing.length) throw new Error(`Missing required migrations: ${missing.join(", ")}`);
  const expectedChecksums = new Map(REQUIRED_MIGRATIONS.map((id) => [
    id,
    createHash("sha256").update(readFileSync(resolve("drizzle", id), "utf8")).digest("hex"),
  ]));
  const mismatched = rows.filter((row) => expectedChecksums.get(row.id) !== row.checksum);
  if (mismatched.length) {
    throw new Error(`Migration checksum mismatch: ${mismatched.map((row) => row.id).join(", ")}`);
  }

  const [{ replicaIdentity }] = await sql`
    select relreplident as "replicaIdentity"
    from pg_class
    where oid = 'public.message_reactions'::regclass
  `;
  if (replicaIdentity !== "f") {
    throw new Error("message_reactions must use REPLICA IDENTITY FULL; apply 47-message-reactions-replica-identity.sql");
  }

  console.log(`Migration readiness passed (${REQUIRED_MIGRATIONS.length} required migrations).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
