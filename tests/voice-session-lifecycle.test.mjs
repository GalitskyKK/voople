import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createVoiceOperationGate } from "../src/lib/livekit/voice-operation-gate.ts";

const read = (path) => readFileSync(path, "utf8");

test("voice operation generations reject work completed after cancellation", () => {
  const gate = createVoiceOperationGate();
  const first = gate.begin();
  assert.equal(gate.isCurrent(first), true);

  gate.cancel();
  assert.equal(gate.isCurrent(first), false);

  const second = gate.begin();
  assert.equal(gate.isCurrent(second), true);
  assert.equal(gate.isCurrent(first), false);
});

test("join uses microphone intent and compensates a cancelled server enter", () => {
  const control = read("src/components/chat/ChatRoomControl.tsx");

  assert.match(control, /micMuted: desiredMicMutedRef\.current/);
  assert.doesNotMatch(control, /mutateAsync\(\{ chatId, micMuted \}\)/);
  assert.match(control, /if \(!isCurrent\(\)\) \{\s+await leave\.mutateAsync/);
  assert.match(control, /sessionOperation\.cancel\(\);\s+disconnectMedia\(\)/);
});

test("LiveKit connect checks its generation after every long async boundary", () => {
  const connection = read("src/components/chat/voice/useVoiceMediaConnection.ts");

  assert.match(connection, /const isCurrent = \(\) =>/);
  assert.match(connection, /await getCredentials\(\);\s+if \(!isCurrent\(\)\) return/);
  assert.match(connection, /await room\.prepareConnection[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
  assert.match(connection, /await room\.startAudio\(\)[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
  assert.match(connection, /await syncVoiceTrackProcessor[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
});
