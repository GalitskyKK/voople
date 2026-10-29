type Tile = { id: string; participantCount: number };
export type OrbitRoomPlacement = { id: string; x: number; y: number; width: number; height: number };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));

/** Dense two-column lens: large resting covers and fixed centres during preview. */
export function layoutOrbitRooms(width: number, rooms: Tile[], expandedId: string | null, currentId?: string | null) {
  const columns = Math.min(2, Math.max(1, rooms.length));
  const step = width * .48;
  const pitch = width * .4 + 48;
  const anchors = rooms.map((room, index) => ({ id: room.id, x: width / 2 + (index % columns - (columns - 1) / 2) * step, y: Math.floor(index / columns) * pitch + width * .22 + 36 }));
  const selected = anchors.find(anchor => anchor.id === expandedId);
  const placements = rooms.map((room, index): OrbitRoomPlacement => {
    const anchor = anchors[index];
    const expanded = room.id === expandedId;
    const dx = selected ? anchor.x - selected.x : 0;
    const dy = selected ? anchor.y - selected.y : 0;
    const influence = selected ? Math.exp(-.5 * ((dx / (width * .32)) ** 2 + (dy / (width * .48)) ** 2)) : 0;
    const restingWidth = width * (room.id === currentId ? .4 : .38);
    const tileWidth = expanded ? width * .44 : restingWidth * (1 - influence * .08);
    const centerX = clamp(anchor.x, tileWidth / 2 + 8, width - tileWidth / 2 - 8);
    const centerY = anchor.y;
    const titleHeight = expanded ? 32 : 28;
    const y = Math.max(0, centerY - titleHeight - tileWidth / 2);
    return { id: room.id, x: centerX - tileWidth / 2, y, width: tileWidth, height: tileWidth + titleHeight + 12 };
  });
  return { anchors, placements, height: Math.max(0, ...placements.map(tile => tile.y + tile.height)) };
}
