export function formatPlaybackTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function readAudioDurationSeconds(file: File): Promise<number | null> {
  if (typeof window === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const audio = new Audio();
    audio.preload = "metadata";
    const duration = await new Promise<number>((resolve, reject) => {
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          resolve(audio.duration);
        } else {
          reject(new Error("duration"));
        }
      };
      audio.onerror = () => reject(new Error("metadata"));
      audio.src = url;
    });
    return Math.round(duration);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function parseTrackFilename(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[^.]+$/, "").trim();
  const dash = base.split(/\s*[–—-]\s+/);
  if (dash.length >= 2) {
    return { artist: dash[0]!.trim(), title: dash.slice(1).join(" - ").trim() };
  }
  return {
    title: base || "Без названия",
    artist: "",
  };
}
