import { spawnSync } from "node:child_process";
import process from "node:process";

import postgres from "postgres";

import { RELEASE_APPLY_ORDER } from "./migration-manifest.mjs";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const releaseVersion = process.env.RELEASE_VERSION?.trim();
if (!databaseUrl) throw new Error("Migration promotion requires DIRECT_URL or DATABASE_URL.");
if (!releaseVersion || !/^\d+\.\d+\.\d+$/.test(releaseVersion)) {
  throw new Error("Migration promotion requires a semantic RELEASE_VERSION.");
}

for (const migration of RELEASE_APPLY_ORDER) {
  const result = spawnSync(process.execPath, ["scripts/apply-migration.mjs", migration], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, RELEASE_VERSION: releaseVersion },
  });
  if (result.status !== 0) throw new Error(`Migration failed: ${migration}`);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 30,
  idle_timeout: 5,
  ssl: "require",
});
try {
  let total = 0;
  for (let batch = 0; batch < 10_000; batch += 1) {
    const [{ processed }] = await sql`
      select public.backfill_legacy_group_emoji_messages(500) as processed
    `;
    const count = Number(processed);
    total += count;
    if (count === 0) break;
    if (batch === 9_999) throw new Error("Emoji backfill exceeded the safety batch limit.");
  }
  console.log(`Legacy emoji backfill completed (${total} messages updated).`);
} finally {
  await sql.end({ timeout: 5 });
}

const readiness = spawnSync(process.execPath, ["scripts/check-migration-readiness.mjs"], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});
if (readiness.status !== 0) throw new Error("Migration readiness failed after promotion.");
