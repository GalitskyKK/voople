import {
  DEFAULT_HOTKEY_BINDINGS,
  sanitizeHotkeys,
  type HotkeyBinding,
} from "@/lib/hotkeys";
import { normalizeSoundPack, type SoundPackId } from "@/lib/sound/sound-catalog";

export type FontScale = "small" | "standard" | "large";
export type InterfaceDensity = "comfortable" | "compact";
export type InterfaceDesign = "classic" | "orbit";
export type ChatWallpaper = "plain" | "doodles" | "grid" | "aurora";

export type AppPreferences = {
  interfaceDesign: InterfaceDesign;
  fontScale: FontScale;
  density: InterfaceDensity;
  reduceMotion: boolean;
  showPresence: boolean;
  chatWallpaper: ChatWallpaper;
  notifyMessages: boolean;
  notifyCalls: boolean;
  notifyReplies: boolean;
  notifyReactions: boolean;
  notificationPreview: boolean;
  notificationSound: boolean;
  soundPack: SoundPackId;
  closeToTray: boolean;
  minimizeToTray: boolean;
  hotkeys: HotkeyBinding[];
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  interfaceDesign: "orbit",
  fontScale: "standard",
  density: "comfortable",
  reduceMotion: false,
  showPresence: true,
  chatWallpaper: "doodles",
  notifyMessages: true,
  notifyCalls: true,
  notifyReplies: true,
  notifyReactions: true,
  notificationPreview: true,
  notificationSound: true,
  soundPack: "default",
  closeToTray: true,
  minimizeToTray: false,
  hotkeys: DEFAULT_HOTKEY_BINDINGS,
};

const STORAGE_KEY = "voople:app-preferences";
const CHANGE_EVENT = "voople:app-preferences-change";
let cachedRaw: string | null | undefined;
let cachedPreferences: AppPreferences = DEFAULT_APP_PREFERENCES;
let memoryOnly = false;

export function readAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;
  if (memoryOnly) return cachedPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPreferences;
    const parsed = JSON.parse(raw ?? "{}") as Partial<AppPreferences>;
    cachedRaw = raw;
    cachedPreferences = {
      interfaceDesign: parsed.interfaceDesign === "classic" ? "classic" : "orbit",
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
      notifyMessages: parsed.notifyMessages !== false,
      notifyCalls: parsed.notifyCalls !== false,
      notifyReplies: parsed.notifyReplies !== false,
      notifyReactions: parsed.notifyReactions !== false,
      notificationPreview: parsed.notificationPreview !== false,
      notificationSound: parsed.notificationSound !== false,
      soundPack: normalizeSoundPack(parsed.soundPack),
      closeToTray: parsed.closeToTray !== false,
      minimizeToTray: parsed.minimizeToTray === true,
      hotkeys: sanitizeHotkeys(parsed.hotkeys),
    };
    return cachedPreferences;
  } catch {
    return cachedPreferences;
  }
}

export function writeAppPreferences(value: AppPreferences) {
  const raw = JSON.stringify(value);
  try { window.localStorage.setItem(STORAGE_KEY, raw); memoryOnly = false; } catch { memoryOnly = true; }
  cachedRaw = raw;
  cachedPreferences = value;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAppPreferences(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) { memoryOnly = false; cachedRaw = undefined; onChange(); }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
