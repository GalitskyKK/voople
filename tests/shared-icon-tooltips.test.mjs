import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveTooltipPosition } from "../src/lib/layout/tooltip-position.ts";

const read = (path) => readFileSync(path, "utf8");

test("tooltip placement flips at the preferred edge and remains inside the viewport", () => {
  const topEdge = resolveTooltipPosition({
    anchor: { top: 4, right: 64, bottom: 36, left: 32, width: 32, height: 32 },
    tooltip: { width: 120, height: 30 },
    viewport: { width: 320, height: 240 },
    preferredSide: "top",
  });
  assert.equal(topEdge.side, "bottom");
  assert.equal(topEdge.top, 44);
  assert.equal(topEdge.left, 8);

  const rightEdge = resolveTooltipPosition({
    anchor: { top: 90, right: 316, bottom: 122, left: 284, width: 32, height: 32 },
    tooltip: { width: 96, height: 30 },
    viewport: { width: 320, height: 240 },
    preferredSide: "right",
  });
  assert.equal(rightEdge.side, "left");
  assert.equal(rightEdge.left, 180);
  assert.ok(rightEdge.top >= 8);
});

test("shared tooltip supports mouse, keyboard, viewport changes and reduced motion", () => {
  const tooltip = read("src/components/ui/Tooltip.tsx");
  const iconButton = read("src/components/ui/IconButton.tsx");
  const styles = read("src/app/globals.css");

  assert.match(tooltip, /event\.pointerType !== "touch"/);
  assert.match(tooltip, /onFocusCapture/);
  assert.match(tooltip, /event\.key === "Escape"/);
  assert.match(tooltip, /addEventListener\("scroll", handleViewportChange, true\)/);
  assert.match(iconButton, /aria-label=\{label\}/);
  assert.doesNotMatch(iconButton, /title=/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.voople-tooltip/);
});

test("room and primary messaging icon controls share one tooltip vocabulary", () => {
  const roomHeader = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const roomMedia = read("src/components/chat/voice/VoiceMediaControls.tsx");
  const roomFooter = read("src/components/chat/voice/VoiceRoomFooter.tsx");
  const roomDock = read("src/components/chat/voice/VoiceSessionDock.tsx");
  const composer = read("src/components/chat/ChatComposerInputView.tsx");
  const recorder = read("src/components/chat/ChatVoiceRecorder.tsx");
  const groupHeader = read("src/components/chat/GroupInfoDrawerView.tsx");

  for (const source of [roomHeader, roomMedia, roomFooter, roomDock, composer, recorder, groupHeader]) {
    assert.match(source, /components\/ui\/(?:IconButton|Tooltip)/);
  }
  for (const source of [roomHeader, roomFooter, roomDock, recorder, groupHeader]) {
    assert.doesNotMatch(source, /title=/);
  }
});

test("attachment menu always offers photos and only offers music with a picker", () => {
  const attach = read("src/components/chat/ChatAttachMenu.tsx");

  assert.match(attach, /onClick=\{\(\) => pick\(onPickPhoto\)\}[\s\S]*Фото/);
  assert.match(attach, /\{onPickMusic \? <button[\s\S]*onClick=\{\(\) => pick\(onPickMusic\)\}[\s\S]*Музыка из плейлиста/);
  assert.doesNotMatch(attach, /\{onPickMusic \? <button[\s\S]{0,300}pick\(onPickPhoto\)/);
});
