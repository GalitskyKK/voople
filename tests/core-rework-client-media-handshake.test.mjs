import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core Room join performs token exchange before provider handoff", async () => {
  const [joinHook, mediaHandoff, connectedPanel, voiceTypes] = await Promise.all([
    readFile(new URL("../src/hooks/useGroupNowRoomJoin.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowMediaHandoff.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowConnectedPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/types/voice.ts", import.meta.url), "utf8"),
  ]);

  const joinIndex = joinHook.indexOf("joinMutation.mutateAsync");
  const tokenIndex = mediaHandoff.indexOf("mediaTokenMutation.mutateAsync");
  const handoffIndex = mediaHandoff.indexOf("onJoined(target, result, credentials)");
  assert.ok(joinIndex >= 0 && tokenIndex >= 0 && handoffIndex > tokenIndex);
  assert.match(joinHook, /mediaHandoff\.connect\(target, result\)/);
  assert.match(mediaHandoff, /mediaTokenMutation\.isPending/);
  assert.match(mediaHandoff, /if \(!credentials\.enabled\)/);
  assert.match(mediaHandoff, /Медиасервер для комнаты временно недоступен/);
  assert.match(mediaHandoff, /leaveMutation\.mutateAsync\(\{ sessionId: result\.sessionId \}\)/);
  assert.match(connectedPanel, /credentials: EnabledVoiceMediaCredentials/);
  assert.match(voiceTypes, /export type EnabledVoiceMediaCredentials/);
  assert.match(voiceTypes, /export type VoiceMediaCredentials/);
  assert.match(voiceTypes, /enabled: false/);
  assert.match(voiceTypes, /enabled: true/);
});

test("legacy and core media connections share one typed credential contract", async () => {
  const connection = await readFile(
    new URL("../src/components/chat/voice/useVoiceMediaConnection.ts", import.meta.url),
    "utf8",
  );

  assert.match(connection, /import type \{ VoiceMediaCredentials \} from "@\/types\/voice"/);
  assert.doesNotMatch(connection, /type VoiceMediaCredentials\s*=/);
  assert.match(connection, /getCredentials: \(\) => Promise<VoiceMediaCredentials>/);
});
