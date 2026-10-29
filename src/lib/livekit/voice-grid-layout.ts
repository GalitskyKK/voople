/** Fit readable square identity tiles; overflow only when the minimum size cannot fit. */
export function layoutVoiceGrid(width: number, height: number, count: number) {
  const gap = width < 420 ? 12 : 16, caption = 24, padding = 12;
  const availableWidth = Math.max(0, width - padding * 2);
  const availableHeight = Math.max(0, height - padding * 2);
  if (count < 1) return { columns: 1, rows: 0, size: 88, width: 0, height: 0, gap };
  const maxColumns = Math.min(count, width < 420 ? 2 : Math.max(2, Math.min(6, Math.floor(availableWidth / 128))));
  const candidates = Array.from({ length: maxColumns }, (_, index) => {
    const columns = index + 1, rows = Math.ceil(count / columns);
    const size = Math.floor(Math.max(72, Math.min(176,
      (availableWidth - gap * (columns - 1)) / columns,
      Math.max(80, (availableHeight - gap * (rows - 1)) / rows - caption),
    )));
    return { columns, rows, size, width: columns * size + gap * (columns - 1), height: rows * (size + caption) + gap * (rows - 1), gap };
  });
  if (width < 420 && count > 1) return candidates[maxColumns - 1];
  return candidates.reduce((best, next) => next.size > best.size || next.size === best.size && next.height < best.height ? next : best);
}
