import assert from "node:assert/strict";
import test from "node:test";
import { layoutVoiceGrid } from "../src/lib/livekit/voice-grid-layout.ts";
import { resolveContextMenuPosition } from "../src/lib/layout/context-menu-position.ts";

test("satellite actions open beside the tile and flip outside its left edge on narrow screens", () => {
  const base = { menuWidth: 192, menuHeight: 180, viewportWidth: 360, viewportHeight: 640, side: "right" };
  assert.deepEqual(resolveContextMenuPosition({ ...base, anchor: { kind: "rect", left: 20, top: 100, right: 110, bottom: 190 } }), { left: 114, top: 100 });
  assert.deepEqual(resolveContextMenuPosition({ ...base, anchor: { kind: "rect", left: 210, top: 100, right: 300, bottom: 190 } }), { left: 14, top: 100 });
});

test("mobile voice grid keeps two columns and fits common call sizes without a long list", () => {
  for (const count of [2, 4, 6, 8]) {
    const grid = layoutVoiceGrid(320, 520, count);
    assert.equal(grid.columns, 2);
    assert.ok(grid.size >= 80);
    assert.ok(grid.width + 24 <= 320);
    assert.ok(grid.height + 24 <= 520);
    assert.ok(grid.rows * grid.columns >= count);
  }
});

test("dense calls preserve readable identities and permit bounded overflow", () => {
  const grid = layoutVoiceGrid(320, 360, 24);
  assert.equal(grid.columns, 2);
  assert.ok(grid.size >= 80);
  assert.ok(grid.height > 360);
  for (const width of [480, 720, 1100]) {
    const desktop = layoutVoiceGrid(width, 600, 12);
    assert.ok(desktop.width + 24 <= width);
    assert.ok(desktop.size <= 176);
    assert.ok(desktop.columns >= 2);
  }
});
