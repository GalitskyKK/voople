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
  const lifecycle = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");

  assert.match(lifecycle, /server\.enter\.run\(desiredMicMutedRef\.current\)/);
  assert.doesNotMatch(lifecycle, /mutateAsync\(\{ chatId, micMuted \}\)/);
  assert.match(lifecycle, /if \(!isCurrent\(\)\) \{\s+await server\.leave\.run/);
  assert.match(lifecycle, /sessionOperation\.cancel\(\);\s+mediaConnection\.disconnect\(\)/);
});

test("ChatRoomControl is only a shared controller-to-view boundary", () => {
  const control = read("src/components/chat/ChatRoomControl.tsx");
  const view = read("src/components/chat/voice/ChatRoomControlView.tsx");
  const sheet = read("src/components/chat/voice/VoiceRoomSheet.tsx");
  const sheetModels = read("src/components/chat/voice/voice-room-sheet-models.ts");
  const baseline = read(".architecture-baseline.json");

  assert.match(control, /useChatRoomControl\(props, ref\)/);
  assert.match(control, /<ChatRoomControlView controller=\{controller\}/);
  assert.doesNotMatch(control, /useState|mutateAsync|new Room/);
  assert.match(view, /<VoiceRoomSheet/);
  assert.match(sheet, /<VoiceRoomHeader/);
  assert.match(sheet, /<VoiceRoomContent/);
  assert.match(sheet, /<VoiceRoomFooter/);
  assert.match(sheetModels, /identity: VoiceRoomIdentityModel/);
  assert.match(sheetModels, /connection: VoiceRoomConnectionModel/);
  assert.match(sheetModels, /session: VoiceRoomSessionModel/);
  assert.doesNotMatch(baseline, /ChatRoomControl\.tsx/);
});

test("room sheet owns one secondary panel and cancels stale fullscreen requests", () => {
  const sheet = read("src/components/chat/voice/VoiceRoomSheet.tsx");
  const fullscreen = read("src/components/chat/voice/useVoiceRoomFullscreen.ts");

  assert.match(sheet, /type SecondaryPanel = "settings" \| "soundboard" \| "invite" \| null/);
  assert.match(sheet, /setSecondaryPanel\(null\);\s+void exitFullscreen\(\);\s+onClose\(\)/);
  assert.doesNotMatch(sheet, /settingsOpen|soundboardOpen/);
  assert.match(fullscreen, /if \(pendingRef\.current\) return/);
  assert.match(fullscreen, /generationRef\.current !== generation/);
  assert.match(fullscreen, /document\.fullscreenElement === target/);
  assert.match(fullscreen, /\.desktop-window-content/);
  assert.match(fullscreen, /useEffect\(\(\) => \{\s+\/\/[^\n]+\n[^\n]+\n[^\n]+\n\s+mountedRef\.current = true/);
  assert.match(fullscreen, /mountedRef\.current = false/);
});

test("microphone test cancels pending device access and prevents duplicate starts", () => {
  const micTest = read("src/components/chat/voice/useVoiceMicTest.ts");

  assert.match(micTest, /if \(pendingRef\.current\) return/);
  assert.match(micTest, /generationRef\.current !== generation/);
  assert.match(micTest, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(micTest, /mountedRef\.current = false/);
});

test("LiveKit connect checks its generation after every long async boundary", () => {
  const connection = read("src/components/chat/voice/useVoiceMediaConnection.ts");

  assert.match(connection, /const isCurrent = \(\) =>/);
  assert.match(connection, /await getCredentials\(\);\s+if \(!isCurrent\(\)\) return/);
  assert.match(connection, /await room\.prepareConnection[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
  assert.match(connection, /await room\.startAudio\(\)[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
  assert.match(connection, /await syncVoiceTrackProcessor[\s\S]*if \(!isCurrent\(\)\) return abandonRoom\(room\)/);
});
