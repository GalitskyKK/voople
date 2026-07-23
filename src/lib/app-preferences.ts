export type FontScale = "small" | "standard" | "large";
export type InterfaceDensity = "comfortable" | "compact";
export type ChatWallpaper = "plain" | "doodles" | "grid" | "aurora";

export type AppPreferences = {
  fontScale: FontScale;
  density: InterfaceDensity;
  reduceMotion: boolean;
  showPresence: boolean;
  chatWallpaper: ChatWallpaper;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  fontScale: "standard",
  density: "comfortable",
  reduceMotion: false,
  showPresence: true,
  chatWallpaper: "doodles",
};

const STORAGE_KEY = "voople:app-preferences";
const CHANGE_EVENT = "voople:app-preferences-change";
let cachedRaw: string | null | undefined;
let cachedPreferences: AppPreferences = DEFAULT_APP_PREFERENCES;

export function readAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPreferences;
    const parsed = JSON.parse(raw ?? "{}") as Partial<AppPreferences>;
    cachedRaw = raw;
    cachedPreferences = {
      fontScale: ["small", "standard", "large"].includes(parsed.fontScale ?? "")
        ? (parsed.fontScale as FontScale)
        : DEFAULT_APP_PREFERENCES.fontScale,
      density: ["comfortable", "compact"].includes(parsed.density ?? "")
        ? (parsed.density as InterfaceDensity)
        : DEFAULT_APP_PREFERENCES.density,
      reduceMotion: parsed.reduceMotion === true,
      showPresence: parsed.showPresence !== false,
      chatWallpaper: ["plain", "doodles", "grid", "aurora"].includes(parsed.chatWallpaper ?? "")
        ? (parsed.chatWallpaper as ChatWallpaper)
        : DEFAULT_APP_PREFERENCES.chatWallpaper,
    };
    return cachedPreferences;
  } catch {
    cachedRaw = undefined;
    cachedPreferences = DEFAULT_APP_PREFERENCES;
    return DEFAULT_APP_PREFERENCES;
  }
}

export function writeAppPreferences(value: AppPreferences) {
  const raw = JSON.stringify(value);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedPreferences = value;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAppPreferences(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
