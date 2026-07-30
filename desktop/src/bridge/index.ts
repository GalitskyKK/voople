import { browserBridge } from "./browser";
import type { DesktopBridge } from "./types";

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export async function getDesktopBridge(): Promise<DesktopBridge> {
  if (!isTauriRuntime()) return browserBridge;
  const { tauriBridge } = await import("./tauri");
  return tauriBridge;
}

export type { DesktopBridge, DesktopRuntimeInfo } from "./types";
