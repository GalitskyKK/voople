import assert from "node:assert/strict";
import test from "node:test";
import { layoutOrbitRooms } from "../src/lib/chat/orbit-room-layout.ts";
const rooms = Array.from({ length: 12 }, (_, index) => ({ id: `room-${index}`, participantCount: index === 4 ? 50 : index }));
const cover = (tile, active) => ({ x: tile.x, y: tile.y + (active ? 32 : 28), width: tile.width, height: tile.width });

test("the Room lens preserves cover centres and neighbour slots instead of repacking", () => {
  for (const width of [280, 320, 720]) for (const count of [1, 2, 3, 6, 12]) {
    const input = rooms.slice(0, count);
    const compact = layoutOrbitRooms(width, input, null, "room-0");
    for (const selected of input) {
      const layout = layoutOrbitRooms(width, input, selected.id, "room-0");
      for (const [index, tile] of layout.placements.entries()) {
        const anchor = compact.anchors[index];
        const rect = cover(tile, tile.id === selected.id);
        assert.ok(tile.x >= 0 && tile.x + tile.width <= width + .01);
        assert.ok(Math.abs(rect.x + rect.width / 2 - anchor.x) < .01);
        assert.ok(Math.abs(rect.y + rect.height / 2 - anchor.y) < .01);
        const original = cover(compact.placements[index], false);
        if (tile.id === selected.id) {
          assert.ok(tile.width > original.width * 1.05 && tile.width < original.width * 1.2);
          assert.ok(original.width >= width * .38, "resting covers nearly fill their two-column slots");
          assert.ok(Math.abs(rect.x + rect.width / 2 - original.x - original.width / 2) < .01);
          assert.ok(Math.abs(rect.y + rect.height / 2 - original.y - original.height / 2) < .01);
        }
        for (const other of layout.placements) if (tile.id !== other.id) {
          const b = cover(other, other.id === selected.id);
          assert.ok(rect.x + rect.width <= b.x || b.x + b.width <= rect.x || rect.y + rect.height <= b.y || b.y + b.height <= rect.y, `${width}px: ${tile.id} cover must not overlap ${other.id}`);
        }
      }
    }
  }
});

test("participant popovers never move the Room map or change DOM order", () => {
  const original = layoutOrbitRooms(300, rooms, "room-4");
  const crowded = layoutOrbitRooms(300, rooms.map(room => ({ ...room, participantCount: 100 })), "room-4");
  assert.deepEqual(original, crowded);
  assert.deepEqual(original.placements.map(tile => tile.id), rooms.map(room => room.id));
});
