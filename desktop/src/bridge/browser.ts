import type { DesktopBridge } from "./types";

export const browserBridge: DesktopBridge = {
  async getRuntimeInfo() {
    return {
      appVersion: "web-preview",
      arch: "browser",
      os: navigator.platform || "unknown",
      runtime: "browser",
    };
  },
  async showMainWindow() {},
};
