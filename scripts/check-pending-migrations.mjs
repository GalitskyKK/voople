import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { acceptedMigrationChecksums } from "./migration-checksum.mjs";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.E2E_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Migration audit requires Supabase URL and service-role credentials.");
}

const response = await fetch(
  `${supabaseUrl}/rest/v1/app_schema_migrations?select=id,checksum`,
  {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  },
);

if (!response.ok) {
  throw new Error(`Unable to read migration registry: HTTP ${response.status}.`);
}

const rows = await response.json();
const applied = new Map(rows.map((row) => [row.id, row.checksum]));
const pending = REQUIRED_MIGRATIONS.filter((id) => !applied.has(id));
const mismatched = REQUIRED_MIGRATIONS.filter((id) => {
  const checksum = applied.get(id);
  if (!checksum) return false;
  const source = readFileSync(resolve("drizzle", id), "utf8");
  return !acceptedMigrationChecksums(source).has(checksum);
});

if (mismatched.length) {
  throw new Error(`Migration checksum mismatch: ${mismatched.join(", ")}`);
}

if (pending.length) {
  console.log(`Pending release migrations (${pending.length}):`);
  for (const id of pending) console.log(`- ${id}`);
} else {
  console.log(`All ${REQUIRED_MIGRATIONS.length} required migrations are registered.`);
}
