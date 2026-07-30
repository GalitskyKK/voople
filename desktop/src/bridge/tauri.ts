import { invoke } from "@tauri-apps/api/core";

import type { DesktopBridge, DesktopRuntimeInfo } from "./types";

export const tauriBridge: DesktopBridge = {
  getRuntimeInfo() {
    return invoke<DesktopRuntimeInfo>("runtime_info");
  },
  showMainWindow() {
    return invoke<void>("show_main_window");
  },
};
