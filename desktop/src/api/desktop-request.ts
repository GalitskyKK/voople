import { getVersion } from "@tauri-apps/api/app";

import {
  CORE_DIRECT_VOICE_PROTOCOL,
  DESKTOP_UPDATE_REQUIRED,
  DESKTOP_VERSION_HEADER,
  VOICE_PROTOCOL_HEADER,
} from "@/lib/http/desktop-compatibility";

export const DESKTOP_UPDATE_REQUIRED_EVENT = "voople:desktop-update-required";

let versionPromise: Promise<string | null> | null = null;

export async function desktopRequestHeaders(): Promise<Record<string, string>> {
  if (!("__TAURI_INTERNALS__" in window)) return {};
  versionPromise ??= getVersion().then((version) => version).catch(() => null);
  const version = await versionPromise;
  return {
    ...(version ? { [DESKTOP_VERSION_HEADER]: version } : {}),
    [VOICE_PROTOCOL_HEADER]: CORE_DIRECT_VOICE_PROTOCOL,
  };
}

export async function desktopApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 403 || response.status === 426) {
    const body = await response.clone().text().catch(() => "");
    if (body.includes(DESKTOP_UPDATE_REQUIRED)) {
      window.dispatchEvent(new Event(DESKTOP_UPDATE_REQUIRED_EVENT));
    }
  }
  return response;
}
