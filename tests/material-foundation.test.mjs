import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Void and Light share one semantic material contract", () => {
  const css = read("src/app/globals.css");
  const light = css.match(/html\[data-app-theme="light"\] \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light);
  for (const token of [
    "canvas-workspace", "canvas-sidebar", "panel-fill", "raised-fill",
    "control-fill", "overlay-fill", "inset-fill", "interactive-fill",
    "border", "border-hover", "shadow", "focus-ring", "skeleton-base",
  ]) {
    assert.match(css, new RegExp(`--material-${token}:`));
    assert.match(light, new RegExp(`--material-${token}:`));
  }
  assert.match(css, /\.voople-skeleton--avatar \{ border-radius: 50%; \}/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.voople-skeleton \{ animation: none/);
});

test("Messenger consumes material surfaces without forcing dark mode", () => {
  const css = read("src/app/styles/messenger-glass.css");
  assert.doesNotMatch(css, /color-scheme:\s*dark/);
  assert.match(css, /html\[data-app-theme="light"\] :where\(\.voople-shell/);
  for (const token of ["stage", "chrome", "panel-fill", "raised-fill", "control-fill", "overlay-fill"]) {
    assert.match(css, new RegExp(`var\\(--material-${token}\\)`));
  }
  assert.doesNotMatch(css, /--voople-glass-fill:\s*linear-gradient/);
});

test("Group Voice uses opaque matte current state without optical Room decoration", () => {
  const globals = read("src/app/globals.css");
  const messenger = read("src/app/styles/messenger-glass.css");
  const room = read("src/components/chat/GroupNowRoomSection.tsx");
  for (const token of ["current-fill", "row-hover", "stage", "chrome"]) {
    assert.match(globals, new RegExp(`--material-${token}:`));
  }
  assert.match(messenger, /\.voople-group-now-room--current \{ background: var\(--material-current-fill\)/);
  assert.match(messenger, /box-shadow: inset 2px 0 var\(--material-ice\)/);
  assert.doesNotMatch(room, /voople-room-material|highlight|reflection/);
  assert.doesNotMatch(messenger, /!important|voople-group-now__grid|voople-group-now-create-tile/);
  assert.match(globals, /--material-overlay-fill: #1f2836/);
  assert.match(globals, /--material-overlay-fill: #ffffff/);
  assert.match(globals, /prefers-reduced-transparency: reduce/);
  assert.match(messenger, /prefers-reduced-motion: reduce/);
});

test("canonical loading shapes are reused by list and Room states", () => {
  const skeleton = read("src/components/ui/Skeleton.tsx");
  assert.match(skeleton, /"avatar" \| "text" \| "room" \| "row"/);
  for (const path of [
    "src/components/layout/MessengerSidebarView.tsx",
    "src/components/chat/GroupPeoplePanelState.tsx",
    "src/components/chat/GroupNowPanelView.tsx",
    "src/components/profile/ProfileLoadingView.tsx",
  ]) {
    assert.match(read(path), /<Skeleton/);
  }
});
