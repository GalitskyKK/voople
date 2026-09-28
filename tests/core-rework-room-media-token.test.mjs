import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core Room media credentials use only server-owned session context", async () => {
  const [media, service, router] = await Promise.all([
    readFile(new URL("../src/server/data/chat-room-media-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
  ]);

  assert.match(media, /from\("live_session_participants"\)/);
  assert.match(media, /\.eq\("session_id", sessionId\)/);
  assert.match(media, /\.eq\("user_id", userId\)/);
  assert.match(media, /\.is\("left_at", null\)/);
  assert.match(media, /from\("live_sessions"\)/);
  assert.match(media, /\.eq\("kind", "group_room"\)/);
  assert.match(media, /\.in\("status", \["connecting", "active", "grace"\]\)/);
  assert.match(media, /\.is\("ended_at", null\)/);
  assert.match(media, /groupMediaSessionSchema\.safeParse\(sessionResult\.data\)/);
  assert.match(media, /throw new Error\("Сессия комнаты недоступна"\)/);
  assert.match(media, /roomName: `live-\$\{session\.provider_session_id\}`/);
  assert.match(media, /tokenTtl: "10m"/);
  assert.match(media, /refreshAfterMs: CORE_MEDIA_REFRESH_AFTER_MS/);
  assert.doesNotMatch(router, /coreRoomMediaToken:[\s\S]*?providerSessionId: z\./);
  assert.match(service, /createGroupRoomMediaTokenRest\(sessionId, userId\)/);
});

test("legacy and core credentials share one LiveKit grant implementation", async () => {
  const media = await readFile(
    new URL("../src/server/data/chat-room-media-rest.ts", import.meta.url),
    "utf8",
  );

  assert.match(media, /async function issueParticipantMediaToken/);
  assert.match(media, /roomJoin: true/);
  assert.match(media, /canPublish: true/);
  assert.match(media, /canSubscribe: true/);
  assert.match(media, /roomName: `chat-\$\{chatId\}`/);
  assert.match(media, /roomName: `live-\$\{session\.provider_session_id\}`/);
  assert.match(media, /ttl: input\.tokenTtl \?\? "6h"/);
});
