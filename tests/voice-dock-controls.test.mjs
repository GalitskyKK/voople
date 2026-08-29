import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resizeVoiceDockRect } from "../src/lib/livekit/voice-dock-geometry.ts";
import {
  describeVoiceDockMediaState,
  formatVoiceDockParticipantCount,
  resolveVoiceDockActiveSpeaker,
} from "../src/lib/livekit/voice-dock-state.ts";

const read = (path) => readFileSync(path, "utf8");
const base = {
  rect: { left: 200, top: 120, width: 400, height: 280 },
  viewportWidth: 1000,
  viewportHeight: 700,
  gap: 8,
  minWidth: 360,
  minHeight: 224,
  maxWidth: 720,
  maxHeight: 640,
};

test("voice dock resizes from every edge while the opposite edge stays pinned", () => {
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, direction: "nw", deltaX: -40, deltaY: -30 }),
    { left: 160, top: 90, width: 440, height: 310 },
  );
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, direction: "se", deltaX: 50, deltaY: 60 }),
    { left: 200, top: 120, width: 450, height: 340 },
  );
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, direction: "w", deltaX: 100, deltaY: 0 }),
    { left: 240, top: 120, width: 360, height: 280 },
  );
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, direction: "n", deltaX: 0, deltaY: 100 }),
    { left: 200, top: 176, width: 400, height: 224 },
  );
});

test("voice dock resize is clamped to the viewport and configured maximum", () => {
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, direction: "se", deltaX: 900, deltaY: 900 }),
    { left: 200, top: 120, width: 720, height: 572 },
  );
  assert.deepEqual(
    resizeVoiceDockRect({ ...base, viewportWidth: 340, viewportHeight: 210, direction: "se", deltaX: 50, deltaY: 50 }),
    { left: 200, top: 120, width: 132, height: 82 },
  );
});

test("mini room exposes full-surface drag, eight resize handles and keyboard resizing", () => {
  const dock = read("src/components/chat/voice/VoiceSessionDock.tsx");
  const handles = read("src/components/chat/voice/VoiceDockResizeHandles.tsx");
  const geometry = read("src/components/chat/voice/useVoiceDockGeometry.ts");
  const preview = read("src/components/chat/voice/VoiceMiniStage.tsx");

  assert.match(dock, /onPointerDown=\{\(event\) =>/);
  assert.match(dock, /data-voice-dock-drag-surface/);
  assert.match(preview, /data-voice-dock-drag-surface/);
  for (const direction of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
    assert.match(handles, new RegExp(`direction: "${direction}"`));
  }
  assert.match(handles, /onKeyDown=\{\(event\) => onKeyDown\(direction, event\)\}/);
  assert.match(geometry, /voople:voice-dock-geometry:v2/);
  assert.match(geometry, /window\.addEventListener\("resize", keepInsideViewport\)/);
  assert.match(geometry, /captureClick/);
});

test("remote participant context menu controls the existing persisted LiveKit volume", () => {
  const card = read("src/components/chat/voice/VoiceParticipantCard.tsx");
  const menu = read("src/components/chat/voice/VoiceParticipantContextMenu.tsx");
  const output = read("src/components/chat/voice/useVoiceOutput.ts");

  assert.match(card, /onContextMenu=\{openContextMenu\}/);
  assert.match(card, /event\.key !== "ContextMenu"/);
  assert.match(card, /event\.shiftKey && event\.key === "F10"/);
  assert.match(menu, /anchorPoint=\{anchorPoint\}/);
  assert.match(menu, /max=\{200\}/);
  assert.match(menu, /Заглушить/);
  assert.match(menu, /Сбросить до 100%/);
  assert.match(output, /persistPreferences\(\{[\s\S]*participantVolumes:/);
  assert.match(output, /participant\.trackPublications\.values\(\)/);
});

test("compact room summary keeps participant, speaker and active capture state visible", () => {
  const participants = [
    { id: "me", displayName: "Вы" },
    { id: "biba", displayName: "Biba" },
  ];

  assert.equal(resolveVoiceDockActiveSpeaker(participants, new Set(["biba"])), "Biba");
  assert.equal(resolveVoiceDockActiveSpeaker(participants, new Set()), null);
  assert.equal(formatVoiceDockParticipantCount(1), "1 участник");
  assert.equal(formatVoiceDockParticipantCount(3), "3 участника");
  assert.equal(formatVoiceDockParticipantCount(12), "12 участников");
  assert.deepEqual(
    describeVoiceDockMediaState({ micMuted: false, cameraEnabled: true, screenSharing: true }),
    ["микрофон включён", "камера включена", "экран передаётся"],
  );

  const compact = read("src/components/chat/voice/VoiceCompactSessionDock.tsx");
  const minimal = read("src/components/chat/voice/VoiceMinimalSessionDock.tsx");
  const dock = read("src/components/chat/voice/VoiceSessionDock.tsx");
  assert.match(compact, /activeSpeakerName/);
  assert.match(compact, /VoiceDockMediaIndicators/);
  assert.match(minimal, /participantLabel/);
  assert.match(minimal, /VoiceDockMediaIndicators/);
  assert.match(dock, /reportProductEvent\("room_expanded", \{ state: "full" \}\)/);
});
