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
  assert.match(lifecycle, /sessionOperation\.cancel\(\);?\s+mediaConnection\.disconnect\(\)/);
});

test("ChatRoomControl is only a shared controller-to-view boundary", () => {
  const control = read("src/components/chat/ChatRoomControl.tsx");
  const view = read("src/components/chat/voice/ChatRoomControlView.tsx");
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const surfaceModels = read("src/components/chat/voice/voice-room-sheet-models.ts");
  const baseline = read(".architecture-baseline.json");

  assert.match(control, /useChatRoomControl\(props, ref\)/);
  assert.match(control, /<ChatRoomControlView controller=\{controller\}/);
  assert.doesNotMatch(control, /useState|mutateAsync|new Room/);
  assert.match(view, /<VoiceRoomMainSurface/);
  assert.match(surface, /<VoiceRoomHeader/);
  assert.match(surface, /<VoiceRoomContent/);
  assert.match(surface, /<VoiceRoomFooter/);
  assert.match(surfaceModels, /identity: VoiceRoomIdentityModel/);
  assert.match(surfaceModels, /VoiceRoomMainSurfaceProps/);
  assert.match(surfaceModels, /connection: VoiceRoomConnectionModel/);
  assert.match(surfaceModels, /session: VoiceRoomSessionModel/);
  assert.match(surfaceModels, /roomSwitcher: VoiceRoomSwitcherModel \| null/);
  assert.match(surface, /<VoiceRoomSwitcher/);
  assert.doesNotMatch(baseline, /ChatRoomControl\.tsx/);
});

test("room main surface owns one secondary panel and cancels stale fullscreen requests", () => {
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const fullscreen = read("src/components/chat/voice/useVoiceRoomFullscreen.ts");

  assert.match(surface, /type SecondaryPanel = "settings" \| "soundboard" \| "invite" \| "messages" \| null/);
  assert.match(
    surface,
    /setSecondaryPanel\(\(current\) => current === "messages" \? current : null\);\s+void exitFullscreen\(\);\s+onClose\(\)/,
  );
  assert.doesNotMatch(surface, /settingsOpen|soundboardOpen/);
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

test("LiveKit connect is bounded, single-flight and abandons stale rooms", () => {
  const connection = read("src/components/chat/voice/useVoiceMediaConnection.ts");

  assert.match(connection, /if \(connectPromiseRef\.current\) return connectPromiseRef\.current/);
  assert.match(connection, /const isCurrent = \(\) =>/);
  assert.match(connection, /waitForVoiceMediaConnection\(\s*getCredentials\(\)/);
  assert.match(connection, /VOICE_MEDIA_CREDENTIALS_TIMEOUT_MS/);
  assert.match(connection, /VOICE_MEDIA_ENDPOINT_TIMEOUT_MS/);
  assert.match(connection, /room\.connect\(endpoint\.url, credentials\.token/);
  assert.match(connection, /adaptiveStream: true/);
  assert.match(connection, /disconnectOnPageLeave: true/);
  assert.doesNotMatch(connection, /ConnectionCheck/);
  assert.match(connection, /if \(!isCurrent\(\)\) \{\s+abandonRoom\(room\)/);
  assert.match(connection, /const isCurrentRoom = \(\) => isCurrent\(\) && roomRef\.current === room/);
  assert.match(connection, /await room\.startAudio\(\)[\s\S]*if \(isCurrentRoom\(\)\)/);
  assert.match(connection, /await syncVoiceTrackProcessor[\s\S]*if \(!isCurrentRoom\(\)\) return/);
});

test("voice connection ships without temporary browser debug markers", () => {
  const provider = read("src/components/chat/voice/VoiceSessionProvider.tsx");
  const connection = read("src/components/chat/voice/useVoiceMediaConnection.ts");
  const surface = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");

  assert.doesNotMatch(`${provider}\n${connection}\n${surface}`, /console\.|\[VOICE-/);
  assert.doesNotMatch(connection, /credentials\.token[^)]*console/s);
});
