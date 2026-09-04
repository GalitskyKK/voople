import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core Room launch enters the existing VoiceSessionProvider without persisting its token", async () => {
  const [provider, adapter, runtime, controller, panel, desktopAudio, screenAudioToken] = await Promise.all([
    readFile(new URL("../src/components/chat/voice/VoiceSessionProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceRoomServerAdapter.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceRoomRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useChatRoomControl.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowVoicePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useDesktopScreenAudioPublisher.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useScreenAudioToken.ts", import.meta.url), "utf8"),
  ]);

  assert.match(provider, /openCoreRoom: \(launch: CoreVoiceSessionLaunch\)/);
  assert.match(provider, /\[initialCoreCredentials, setInitialCoreCredentials\] = useState/);
  assert.match(provider, /setInitialCoreCredentials\(null\)/);
  assert.match(provider, /setInitialCoreCredentials\(launch\.credentials\)/);
  assert.match(provider, /initialCoreCredentials=\{initialCoreCredentials \?\? undefined\}/);
  assert.doesNotMatch(provider, /initialCoreCredentialsRef/);
  assert.match(provider, /coreSession: \{/);
  assert.match(provider, /coreSession\?\.join\.sessionId/);
  assert.match(provider, /state\.inside && activeSession\?\.coreSession/);
  assert.doesNotMatch(provider, /setActiveSession\([^)]*credentials/s);

  assert.match(adapter, /useVoiceRoomServerSession\(chatId, open, !core\)/);
  assert.match(adapter, /buildCoreRoomVoiceView/);
  assert.match(adapter, /initialCredentialsRef\.current = null/);
  assert.match(adapter, /coreLeave\.mutateAsync\(\{ sessionId: coreSession\.join\.sessionId \}\)/);
  assert.match(adapter, /coreMediaToken\.mutateAsync\(\{ sessionId: coreSession\.join\.sessionId \}\)/);
  assert.match(runtime, /useVoiceRoomServerAdapter/);
  assert.match(controller, /server\.mediaToken\.get/);
  assert.match(runtime, /server\.heartbeatSessionId/);
  assert.match(panel, /voice\.openCoreRoom/);
  assert.match(desktopAudio, /useScreenAudioToken\(target\)/);
  assert.match(screenAudioToken, /coreRoomScreenAudioToken\.useMutation/);
  assert.match(screenAudioToken, /targetKind === "core"/);
  assert.match(controller, /kind: "core", sessionId: coreSession\.join\.sessionId/);
});
