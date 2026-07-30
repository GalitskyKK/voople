export type DesktopRuntimeInfo = {
  appVersion: string;
  arch: string;
  os: string;
  runtime: "browser" | "tauri";
};

export type DesktopBridge = {
  getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
  showMainWindow: () => Promise<void>;
};
