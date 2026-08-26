import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

import { REQUIRED_MIGRATIONS } from "./migration-manifest.mjs";
import {
  acceptedMigrationChecksums,
  migrationChecksum,
} from "./migration-checksum.mjs";

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
  connection: {
    application_name: "voople_release_readiness",
    statement_timeout: 30_000,
    lock_timeout: 5_000,
  },
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
  const migrationSources = new Map(REQUIRED_MIGRATIONS.map((id) => [
    id,
    readFileSync(resolve("drizzle", id), "utf8"),
  ]));
  const expectedChecksums = new Map(REQUIRED_MIGRATIONS.map((id) => [
    id,
    migrationChecksum(migrationSources.get(id)),
  ]));
  const mismatched = rows.filter(
    (row) => !acceptedMigrationChecksums(migrationSources.get(row.id)).has(row.checksum),
  );
  if (mismatched.length) {
    const details = mismatched.map((row) => {
      const expected = expectedChecksums.get(row.id)?.slice(0, 12) ?? "missing";
      const actual = String(row.checksum).slice(0, 12);
      return `${row.id} (${actual} -> ${expected}, recorded ${row.release_version})`;
    });
    throw new Error(`Migration checksum mismatch: ${details.join(", ")}`);
  }

  const [{ replicaIdentity }] = await sql`
    select relreplident as "replicaIdentity"
    from pg_class
    where oid = 'public.message_reactions'::regclass
  `;
  if (replicaIdentity !== "f") {
    throw new Error("message_reactions must use REPLICA IDENTITY FULL; apply 47-message-reactions-replica-identity.sql");
  }

  const [{ directChatDefinition }] = await sql`
    select pg_get_functiondef('public.get_or_create_direct_chat(uuid, uuid)'::regprocedure) as "directChatDefinition"
  `;
  if (
    !String(directChatDefinition).includes("connection_request_scope")
    || !String(directChatDefinition).includes("privacy_scope_allows")
  ) {
    throw new Error("get_or_create_direct_chat is missing the atomic connection privacy gate; apply 57-direct-chat-privacy-enforcement.sql");
  }

  console.log(`Migration readiness passed (${REQUIRED_MIGRATIONS.length} required migrations).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
