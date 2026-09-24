import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseVoiceDockMode,
  reduceVoiceDockPresentation,
  VOICE_DOCK_MODE_KEY,
} from "../src/lib/livekit/voice-dock-presentation.ts";
import { runConfirmedVoiceLeave } from "../src/components/chat/voice/voice-room-surface.ts";

const read = (path) => readFileSync(path, "utf8");
const full = { fullOpen: true, dockVisible: false, dockMode: "compact" };

test("Full closes to Mini or Compact without changing the active media session", () => {
  const sessionId = "same-live-session";
  for (const [action, mode] of [["close-to-mini", "mini"], ["close-to-compact", "compact"]]) {
    const dock = reduceVoiceDockPresentation(full, { type: action });
    assert.deepEqual(dock, { fullOpen: false, dockVisible: true, dockMode: mode });
    assert.deepEqual(reduceVoiceDockPresentation(dock, { type: "open-full" }), {
      fullOpen: true, dockVisible: false, dockMode: mode,
    });
    assert.equal(sessionId, "same-live-session");
  }
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  assert.match(surface, /closeSurface\("compact"\)/);
  assert.doesNotMatch(surface, /handleEscape[\s\S]{0,180}onCloseToMini\(/);
  const controller = read("src/components/chat/voice/useChatRoomControl.ts");
  assert.match(controller, /onOpen: openRoom/);
  assert.doesNotMatch(controller, /onOpen:.*enterAndConnect/);
});

test("join alone never exposes Mini and changing Dock mode preserves Full/inside state", () => {
  const joined = { fullOpen: false, dockVisible: false, dockMode: "mini" };
  assert.equal(joined.dockVisible, false);
  assert.deepEqual(reduceVoiceDockPresentation(joined, { type: "change-mode", mode: "minimal" }), {
    fullOpen: false, dockVisible: false, dockMode: "minimal",
  });
  assert.deepEqual(reduceVoiceDockPresentation(full, { type: "hide" }), {
    fullOpen: false, dockVisible: false, dockMode: "compact",
  });
});

test("confirmed leave removes Full and Dock; failed leave keeps presentation for retry", async () => {
  let confirmLeave;
  const pending = new Promise((resolve) => { confirmLeave = resolve; });
  let refreshed = 0;
  const leaving = runConfirmedVoiceLeave(() => pending, async () => { refreshed += 1; });
  assert.equal(full.fullOpen, true, "Full stays open while the server has not confirmed leave");
  confirmLeave();
  await leaving;
  assert.deepEqual(reduceVoiceDockPresentation(full, { type: "leave-confirmed" }), {
    fullOpen: false, dockVisible: false, dockMode: "compact",
  });
  await Promise.resolve();
  assert.equal(refreshed, 1);

  const failure = new Error("leave failed");
  await assert.rejects(runConfirmedVoiceLeave(() => Promise.reject(failure), async () => {
    throw new Error("refresh should not run");
  }), failure);
  assert.equal(full.fullOpen, true, "failure must not dispatch leave-confirmed");
  const lifecycle = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");
  assert.match(lifecycle, /setFailedOperation\("leave"\)/);
  assert.match(lifecycle, /return false/);
  const actions = read("src/components/chat/voice/useVoiceRoomPresentationActions.ts");
  assert.match(actions, /if \(!await requestLeaveRoom\(\)\) \{[\s\S]*if \(dock\.dockVisible\) dock\.openFull\(\)/);
  assert.match(actions, /if \(leavePending\) return/);
  assert.match(actions, /dock\.leaveConfirmed\(\)/);
  assert.match(actions, /onLeaveConfirmed\?\.\(chatId, sessionId\)/);
});

test("Dock leave and persisted mode remain bounded and safe", () => {
  assert.equal(parseVoiceDockMode("mini"), "mini");
  assert.equal(parseVoiceDockMode("compact"), "compact");
  assert.equal(parseVoiceDockMode("minimal"), "minimal");
  assert.equal(parseVoiceDockMode("garbage"), "compact");
  assert.equal(parseVoiceDockMode(null), "compact");
  const hook = read("src/components/chat/voice/useVoiceDockPresentation.ts");
  const dock = read("src/components/chat/voice/VoiceSessionDock.tsx");
  const provider = read("src/components/chat/voice/VoiceSessionProvider.tsx");
  assert.match(hook, /localStorage\.getItem\(VOICE_DOCK_MODE_KEY\)/);
  assert.match(hook, /localStorage\.setItem\(VOICE_DOCK_MODE_KEY, state\.dockMode\)/);
  assert.equal(VOICE_DOCK_MODE_KEY, "voople:voice-dock-mode:v1");
  assert.match(dock, /onModeChange\(next\)/);
  assert.match(dock, /onClick=\{onLeave\}/);
  assert.match(provider, /onLeaveConfirmed=\{handleLeaveConfirmed\}/);
  assert.match(provider, /setActiveSession\(null\)/);
});
