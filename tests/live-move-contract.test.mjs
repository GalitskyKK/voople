import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Split and Voop share one persisted, consent-gated transaction", async () => {
  const [migration, manifest, service, data, router] = await Promise.all([
    read("drizzle/76-live-move-consent.sql"),
    read("scripts/migration-manifest.mjs"),
    read("src/server/services/live-move.service.ts"),
    read("src/server/data/live-move-rest.ts"),
    read("src/server/trpc/routers/chat-core-rework.ts"),
  ]);
  assert.equal(manifest.match(/76-live-move-consent\.sql/g)?.length, 2);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.live_move_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.live_move_consents/);
  assert.match(migration, /mode IN \('split', 'voop'\)/);
  assert.match(migration, /source_session_id uuid NOT NULL/);
  assert.match(migration, /cardinality\(p_invitee_ids\) NOT BETWEEN 1 AND 8/);
  assert.match(migration, /count\(\*\) FILTER \(WHERE status = 'accepted'\)/);
  const respond = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.respond_live_move"), migration.indexOf("CREATE OR REPLACE FUNCTION public.cancel_live_move"));
  assert.ok(respond.indexOf("IF v_accepted <> v_total") < respond.indexOf("v_room := public.create_group_room"));
  assert.ok(respond.indexOf("FOREACH v_user_id IN ARRAY v_ids LOOP") < respond.indexOf("v_room := public.create_group_room"));
  assert.match(respond, /public\.join_group_room\(\(v_room->>'id'\)::uuid, v_user_id, true, false\)/);
  assert.match(respond, /status = 'completed', target_room_id/);
  assert.match(respond, /v_fresh_count <> cardinality\(v_ids\)/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.respond_live_move[\s\S]+TO service_role/);
  assert.match(service, /filterUserIdsByPrivacyFieldRest/);
  assert.match(data, /"request_live_move"/);
  assert.match(data, /"respond_live_move"/);
  assert.match(router, /coreRequestLiveMove: protectedProcedure/);
  assert.match(router, /coreRespondLiveMove: protectedProcedure/);
  assert.match(router, /coreLiveMoveStatus: protectedProcedure/);
});
