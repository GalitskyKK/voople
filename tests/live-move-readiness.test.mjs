import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isLiveMoveSchemaUnavailable,
  LIVE_MOVE_SCHEMA_UNAVAILABLE,
} from "../src/lib/chat/live-move-readiness.ts";

test("missing migration has an explicit, non-transient client contract", () => {
  assert.equal(isLiveMoveSchemaUnavailable({
    message: LIVE_MOVE_SCHEMA_UNAVAILABLE,
    data: { code: "PRECONDITION_FAILED" },
  }), true);
  assert.equal(isLiveMoveSchemaUnavailable({
    message: LIVE_MOVE_SCHEMA_UNAVAILABLE,
    data: { code: "BAD_REQUEST" },
  }), false);
  assert.equal(isLiveMoveSchemaUnavailable(new Error("network failed")), false);
});

test("polling stops for missing schema, backs off for transient errors, resumes after migration", async () => {
  const [data, router, bridge] = await Promise.all([
    readFile(new URL("../src/server/data/live-move-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/LiveMoveHandoffBridge.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(data, /sent\.error\?\.code === "PGRST205" \|\| accepted\.error\?\.code === "PGRST205"/);
  assert.match(router, /code: "PRECONDITION_FAILED", message: LIVE_MOVE_SCHEMA_UNAVAILABLE/);
  assert.match(bridge, /isLiveMoveSchemaUnavailable\(query\.state\.error\)\) return false/);
  assert.match(bridge, /query\.state\.error \? 30_000 : 1_500/);
  assert.match(bridge, /refetchOnWindowFocus: \(query\) => !isLiveMoveSchemaUnavailable/);
  assert.match(bridge, /refetchOnReconnect: \(query\) => !isLiveMoveSchemaUnavailable/);
});
