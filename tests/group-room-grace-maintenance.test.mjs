import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("grace maintenance is scheduled, authenticated, bounded and service-role only", async () => {
  const [migration, data, route, config, manifest] = await Promise.all([
    readFile(new URL("../drizzle/75-group-room-grace-maintenance.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/group-room-mutations-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/cron/expire-group-room-grace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /p_limit NOT BETWEEN 1 AND 100/);
  assert.match(migration, /session\.empty_since <= now\(\) - interval '45 seconds'/);
  assert.match(migration, /FOR UPDATE OF room, session SKIP LOCKED/);
  assert.match(migration, /live_session_guests/);
  assert.match(migration, /SET archived_at = now\(\)/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.expire_group_room_grace_bounded\(integer\)\s+TO service_role/);
  assert.match(data, /"expire_group_room_grace_bounded"/);
  assert.match(route, /request\.headers\.get\("authorization"\) !== `Bearer \$\{secret\}`/);
  assert.match(route, /expireGroupRoomGrace\(100\)/);
  assert.equal(JSON.parse(config).crons[0].path, "/api/cron/expire-group-room-grace");
  assert.equal(manifest.match(/75-group-room-grace-maintenance\.sql/g)?.length, 2);
});
