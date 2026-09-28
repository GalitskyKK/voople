import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native core screen audio is session-bound and shares active participant checks", async () => {
  const [data, service, router, publisher, tokenHook] = await Promise.all([
    readFile(new URL("../src/server/data/chat-room-media-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useDesktopScreenAudioPublisher.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useScreenAudioToken.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /resolveGroupRoomMediaContext\(sessionId, userId\)/);
  assert.match(data, /live_session_participants/);
  assert.match(data, /\.is\("left_at", null\)/);
  assert.match(data, /roomName: `live-\$\{session\.provider_session_id\}`/);
  assert.match(data, /createGroupRoomScreenAudioTokenRest/);
  assert.match(data, /canSubscribe: false/);
  assert.match(data, /canPublishData: false/);
  assert.match(data, /canPublishSources: \[TrackSource\.SCREEN_SHARE, TrackSource\.SCREEN_SHARE_AUDIO\]/);
  assert.match(service, /createGroupRoomScreenAudioTokenRest/);
  assert.match(router, /coreRoomScreenAudioToken/);
  assert.match(router, /sessionId: z\.string\(\)\.uuid\(\)/);
  assert.match(router, /screenSessionId: z\.string\(\)\.uuid\(\)/);
  assert.match(router, /assertMultiRoomAccess/);
  assert.match(router, /rateLimits\.enterChatRoom/);
  assert.match(publisher, /useScreenAudioToken\(target\)/);
  assert.match(tokenHook, /coreRoomScreenAudioToken\.useMutation/);
  assert.match(tokenHook, /targetKind === "core"/);
});
