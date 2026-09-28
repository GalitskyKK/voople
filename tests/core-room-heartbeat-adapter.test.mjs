import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("one heartbeat hook serves legacy chats and session-bound core Rooms", async () => {
  const [heartbeat, runtime] = await Promise.all([
    readFile(new URL("../src/components/chat/voice/useVoiceHeartbeat.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceRoomRuntime.ts", import.meta.url), "utf8"),
  ]);

  assert.match(heartbeat, /kind: "legacy"; chatId: string/);
  assert.match(heartbeat, /kind: "core"/);
  assert.match(heartbeat, /coreHeartbeatRoom\.useMutation/);
  assert.match(heartbeat, /sessionId,/);
  assert.match(heartbeat, /cameraEnabled,/);
  assert.match(heartbeat, /screenSharing,/);
  assert.match(heartbeat, /sendLegacyHeartbeat\(\{ chatId, micMuted \}\)/);
  assert.doesNotMatch(heartbeat, /console\.error\([^)]*chatId/s);
  assert.match(runtime, /\{ kind: "legacy", chatId \}/);
  assert.match(runtime, /kind: "core"/);
});
