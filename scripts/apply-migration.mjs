import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
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

function createClient(url) {
  return postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 60,
    idle_timeout: 10,
    ssl: "require",
  });
}

const skipCodes = new Set(["42P06", "42710", "42P07", "42701"]);

async function runStatement(url, client, statement, index, total) {
  const maxAttempts = 3;
  let sql = client;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sql.unsafe(statement);
      return sql;
    } catch (err) {
      if (skipCodes.has(err.code)) {
        console.log(`  ⏭ ${index}/${total} уже есть (${err.code})`);
        return sql;
      }
      const retryable =
        err.message?.includes("ECONNRESET") ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("ETIMEDOUT");
      if (retryable && attempt < maxAttempts) {
        console.log(`  ↻ ${index}/${total} повтор ${attempt + 1}/${maxAttempts}…`);
        await sql.end({ timeout: 1 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
        sql = createClient(url);
        continue;
      }
      throw err;
    }
  }
  return sql;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Нет DIRECT_URL в .env.local");
    process.exit(1);
  }

  const drizzleDir = resolve(process.cwd(), "drizzle");
  const sqlFiles = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql") && !f.includes("dashboard"))
    .sort();

  if (sqlFiles.length === 0) {
    console.error("Нет SQL в drizzle/. Сначала: npm run db:generate");
    process.exit(1);
  }

  let sql = createClient(url);

  for (const file of sqlFiles) {
    const raw = readFileSync(resolve(drizzleDir, file), "utf8");
    const statements = raw
      .split(/--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`\n📄 ${file} (${statements.length} statements)`);

    for (let i = 0; i < statements.length; i++) {
      try {
        sql = await runStatement(url, sql, statements[i], i + 1, statements.length);
      } catch (err) {
        console.error(`\n❌ ${file}, statement ${i + 1}:`, err.message);
        console.error(
          "\n→ Надёжнее: Supabase → SQL Editor → drizzle/apply-in-supabase-dashboard.sql → Run\n",
        );
        await sql.end({ timeout: 1 }).catch(() => {});
        process.exit(1);
      }
    }
    console.log(`✅ ${file} применён`);
  }

  await sql.end({ timeout: 5 });
  console.log("\nГотово. Table Editor → public → users, posts, …");
}

main();
