export type DesktopProcessAudioSource = {
  processId: number;
  name: string;
  executablePath: string | null;
  active: boolean;
};

export type DesktopProcessAudioStartInput = {
  processId: number | null;
  captureSource?: Pick<DesktopCaptureSource, "id" | "kind"> | null;
  captureWidth?: number;
  captureHeight?: number;
  captureFrameRate?: number;
  livekitUrl: string;
  token: string;
  screenSessionId: string;
};

export type DesktopCaptureSource = {
  id: string;
  kind: "screen" | "window";
  title: string;
  processId: number | null;
  canShareAudio: boolean;
  audioActive: boolean;
};

export type DesktopProcessAudioCapabilities = {
  publisherIncluded: boolean;
  publisherSupported: boolean;
  currentWindowsBuild: number | null;
  minimumWindowsBuild: number;
};

export type DesktopProcessAudioBridge = {
  capabilities: () => Promise<DesktopProcessAudioCapabilities>;
  listSources: () => Promise<DesktopProcessAudioSource[]>;
  listCaptureSources: () => Promise<DesktopCaptureSource[]>;
  start: (input: DesktopProcessAudioStartInput) => Promise<void>;
  stop: (screenSessionId: string) => Promise<void>;
};

function normalizeSourceName(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\.exe\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function resolveDesktopProcessAudioSource(
  sources: readonly DesktopProcessAudioSource[],
  preferredProcessId: number | null,
  surfaceLabel = "",
) {
  const preferred = preferredProcessId === null
    ? null
    : sources.find((source) => source.processId === preferredProcessId);
  if (preferred) return preferred.processId;

  const normalizedLabel = normalizeSourceName(surfaceLabel);
  if (normalizedLabel) {
    const matches = sources.filter((source) => {
      const names = [
        source.name,
        source.executablePath?.split(/[\\/]/).at(-1) ?? "",
      ].map(normalizeSourceName).filter(Boolean);
      return names.some((name) => normalizedLabel.includes(name) || name.includes(normalizedLabel));
    });
    if (matches.length === 1) return matches[0]!.processId;
  }

  const active = sources.filter((source) => source.active);
  if (active.length === 1) return active[0]!.processId;
  return sources.length === 1 ? sources[0]!.processId : null;
}

let bridge: DesktopProcessAudioBridge | null = null;

export function setDesktopProcessAudioBridge(next: DesktopProcessAudioBridge | null) {
  bridge = next;
}

export function getDesktopProcessAudioBridge() {
  return bridge;
}
