export type VoiceDockMode = "mini" | "compact" | "minimal";

export type VoiceDockPresentation = {
  fullOpen: boolean;
  dockVisible: boolean;
  dockMode: VoiceDockMode;
};

export type VoiceDockPresentationAction =
  | { type: "open-full" }
  | { type: "close-to-mini" }
  | { type: "close-to-compact" }
  | { type: "hide" }
  | { type: "change-mode"; mode: VoiceDockMode }
  | { type: "leave-confirmed" };

export const VOICE_DOCK_MODE_KEY = "voople:voice-dock-mode:v1";

export function parseVoiceDockMode(value: string | null): VoiceDockMode {
  return value === "mini" || value === "compact" || value === "minimal" ? value : "compact";
}

export function reduceVoiceDockPresentation(
  state: VoiceDockPresentation,
  action: VoiceDockPresentationAction,
): VoiceDockPresentation {
  switch (action.type) {
    case "open-full": return { ...state, fullOpen: true, dockVisible: false };
    case "close-to-mini": return { fullOpen: false, dockVisible: true, dockMode: "mini" };
    case "close-to-compact": return { fullOpen: false, dockVisible: true, dockMode: "compact" };
    case "hide": return { ...state, fullOpen: false, dockVisible: false };
    case "change-mode": return { ...state, dockMode: action.mode };
    case "leave-confirmed": return { ...state, fullOpen: false, dockVisible: false };
  }
}
