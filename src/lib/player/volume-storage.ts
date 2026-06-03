const STORAGE_KEY = "voople-player-volume";

export function readStoredVolume(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 1;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 1;
    return Math.min(1, Math.max(0, value));
  } catch {
    return 1;
  }
}

export function writeStoredVolume(volume: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.min(1, Math.max(0, volume))));
  } catch {
    /* ignore quota */
  }
}
