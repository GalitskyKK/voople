import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { REQUIRED_MIGRATIONS } from "./migration-manifest.mjs";
import { acceptedMigrationChecksums } from "./migration-checksum.mjs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const direct = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

console.log("Voople db-check\n");

if (!url || !serviceKey) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY пусты в .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count, error } = await admin.from("users").select("*", { count: "exact", head: true });

if (error) {
  console.error("FAIL REST (service role):", error.message);
  if (error.code === "42P01") {
    console.error("→ Запустите drizzle/apply-in-supabase-dashboard.sql в SQL Editor");
  }
} else {
  console.log("OK  REST public.users — доступна, строк:", count ?? 0);
}

for (const table of [
  "group_join_requests",
  "interest_categories",
  "interests",
  "user_interests",
  "group_discovery_profiles",
  "group_interests",
  "user_privacy_settings",
  "user_contact_pins",
]) {
  const { error: tableError } = await admin.from(table).select("*", { count: "exact", head: true });
  if (tableError) console.error(`FAIL REST public.${table}:`, tableError.message);
  else console.log(`OK  REST public.${table}`);
}

const { data: ledgerRows, error: ledgerError } = await admin
  .from("app_schema_migrations")
  .select("id, checksum, release_version")
  .in("id", REQUIRED_MIGRATIONS);
if (ledgerError) {
  console.error("FAIL REST migration ledger:", ledgerError.message);
} else {
  const ledger = new Map((ledgerRows ?? []).map((row) => [row.id, row]));
  const missing = REQUIRED_MIGRATIONS.filter((id) => !ledger.has(id));
  const mismatched = REQUIRED_MIGRATIONS.filter((id) => {
    const row = ledger.get(id);
    if (!row) return false;
    const source = readFileSync(resolve("drizzle", id), "utf8");
    return !acceptedMigrationChecksums(source).has(row.checksum);
  });
  if (missing.length) console.error("FAIL ledger missing:", missing.join(", "));
  if (mismatched.length) console.error("FAIL ledger checksum:", mismatched.join(", "));
  if (!missing.length && !mismatched.length) console.log(`OK  migration ledger — ${REQUIRED_MIGRATIONS.length} обязательных миграций`);
}

if (direct && process.env.VOOPLE_SKIP_DIRECT_DB_CHECK !== "1") {
  const sql = postgres(direct, {
    max: 1,
    prepare: direct.includes(":6543") ? false : undefined,
    ssl: "require",
    connect_timeout: 15,
  });
  try {
    const rows = await sql`select count(*)::int as n from public.users`;
    console.log("OK  Postgres DIRECT_URL — public.users, строк:", rows[0].n);
  } catch (err) {
    console.error("FAIL Postgres:", err.message);
    console.error("→ Проверьте Session pooler :5432 (см. docs/setup.md, IPv4)");
  } finally {
    await sql.end({ timeout: 5 });
  }
} else {
  console.warn("SKIP Postgres: нет DIRECT_URL / DATABASE_URL");
}

console.log("\nПосле Add user в Auth: залогиньтесь — sync создаст public.users автоматически.");
