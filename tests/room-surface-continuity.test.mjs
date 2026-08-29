import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveVoiceRoomSurfacePhase,
  waitForVoiceRoomLifecycle,
} from "../src/components/chat/voice/voice-room-surface.ts";

const read = (path) => readFileSync(path, "utf8");

test("room surface phase keeps explicit transitions ahead of stale server state", () => {
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "connecting", loading: false, inside: false, mediaStatus: "idle", hasError: false }), "connecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "leaving", loading: false, inside: true, mediaStatus: "connected", hasError: false }), "leaving");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "post-leave", loading: false, inside: false, mediaStatus: "idle", hasError: false }), "post-leave");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: true, inside: false, mediaStatus: "idle", hasError: false }), "loading");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "reconnecting", hasError: false }), "reconnecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "connected", hasError: true }), "inside");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "idle", hasError: false }), "connecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: false, mediaStatus: "error", hasError: true }), "error");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: false, mediaStatus: "idle", hasError: false }), "preview");
});

test("prejoin, connecting and active room reuse one stable sheet geometry", () => {
  const sheet = read("src/components/chat/voice/VoiceRoomSheet.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const content = read("src/components/chat/voice/VoiceRoomContent.tsx");
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  const surfaceSession = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");

  assert.match(sheet, /h-\[min\(94dvh,860px\)\]/);
  assert.doesNotMatch(sheet, /identity\.active\s*\?/);
  assert.doesNotMatch(header, /identity\.active\s*\?\s*\([\s\S]{0,240}onToggleFullscreen/);
  assert.match(sheet, /session=\{session\}/);
  assert.match(content, /sessionPhase === "connecting"/);
  assert.match(content, /sessionPhase === "leaving"/);
  assert.match(content, /sessionPhase === "loading"/);
  assert.match(content, /sessionPhase === "post-leave"/);
  assert.match(content, /sessionPhase === "preview" && identity\.active/);
  assert.ok(content.indexOf('sessionPhase === "post-leave"') < content.indexOf("if (directCallState)"));
  assert.match(surfaceSession, /setTransition\("connecting"\)/);
  assert.match(surfaceSession, /setTransition\("leaving"\)/);
  assert.match(surfaceSession, /setTransition\("post-leave"\)/);
  assert.match(surfaceSession, /await server\.room\.refetch\(\)/);
  assert.match(control, /server\.room\.error\?\.message/);
});

test("room recovery is bounded, actionable and restores dialog focus", async () => {
  const states = read("src/components/chat/voice/VoiceRoomSessionStates.tsx");
  const surfaceSession = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");
  const sheet = read("src/components/ui/Sheet.tsx");
  const styles = read("src/app/globals.css");

  await assert.rejects(
    waitForVoiceRoomLifecycle(new Promise(() => undefined), 5),
    /Не удалось подтвердить изменение комнаты вовремя/,
  );
  assert.equal(await waitForVoiceRoomLifecycle(Promise.resolve("ok"), 50), "ok");
  assert.match(states, /retryLabel/);
  assert.match(states, /Вы вышли из комнаты/);
  assert.match(surfaceSession, /setFailedOperation\("leave"\)/);
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  assert.match(control, /failedSessionOperation === "leave"/);
  assert.match(control, /roomLoadFailed[\s\S]*"Повторить загрузку"/);
  assert.match(control, /hasError: Boolean\(surfaceErrorMessage\)/);
  assert.match(sheet, /returnTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /autoFocus/);
  assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*\.voople-room-surface__state/);
});
