export type DesktopProcessAudioSource = {
  processId: number;
  name: string;
  executablePath: string | null;
  active: boolean;
};

export type DesktopProcessAudioStartInput = {
  processId: number;
  livekitUrl: string;
  token: string;
  screenSessionId: string;
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
  start: (input: DesktopProcessAudioStartInput) => Promise<void>;
  stop: (screenSessionId: string) => Promise<void>;
};

let bridge: DesktopProcessAudioBridge | null = null;

export function setDesktopProcessAudioBridge(next: DesktopProcessAudioBridge | null) {
  bridge = next;
}

export function getDesktopProcessAudioBridge() {
  return bridge;
}
