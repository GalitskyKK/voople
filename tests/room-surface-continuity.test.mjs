import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveVoiceRoomSurfacePhase } from "../src/components/chat/voice/voice-room-surface.ts";

const read = (path) => readFileSync(path, "utf8");

test("room surface phase keeps explicit transitions ahead of stale server state", () => {
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "connecting", loading: false, inside: false, mediaStatus: "idle", hasError: false }), "connecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "leaving", loading: false, inside: true, mediaStatus: "connected", hasError: false }), "leaving");
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

  assert.match(sheet, /h-\[min\(94dvh,860px\)\]/);
  assert.doesNotMatch(sheet, /identity\.active\s*\?/);
  assert.doesNotMatch(header, /identity\.active\s*\?\s*\([\s\S]{0,240}onToggleFullscreen/);
  assert.match(sheet, /sessionPhase=\{session\.phase\}/);
  assert.match(content, /sessionPhase === "connecting"/);
  assert.match(content, /sessionPhase === "leaving"/);
  assert.match(content, /sessionPhase === "loading"/);
  assert.match(content, /sessionPhase === "preview" && identity\.active/);
  assert.match(control, /setSessionTransition\("connecting"\)/);
  assert.match(control, /setSessionTransition\("leaving"\)/);
  assert.match(control, /await server\.room\.refetch\(\)/);
  assert.match(control, /server\.room\.error\?\.message/);
});
