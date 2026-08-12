import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

import { App } from "./App";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { setPresignedUploadAdapter } from "@/lib/uploads/presigned-upload";
import {
  initializeClientTelemetry,
  reportClientMetric,
} from "@/lib/telemetry/client";
import { getDesktopConfig } from "./config";
import { DesktopErrorBoundary } from "./telemetry/DesktopErrorBoundary";
import "../../src/app/globals.css";
import "./styles.css";

const root = document.getElementById("root");
const telemetryEndpoint = `${getDesktopConfig()?.apiUrl ?? "https://voople.ru"}/api/telemetry`;

initializeClientTelemetry({
  enabled: import.meta.env.PROD,
  endpoint: telemetryEndpoint,
  platform: "desktop",
});

if ("__TAURI_INTERNALS__" in window) {
  void getVersion()
    .then((release) => initializeClientTelemetry({
      enabled: import.meta.env.PROD,
      endpoint: telemetryEndpoint,
      platform: "desktop",
      release,
    }))
    .catch(() => undefined);
}

if ("__TAURI_INTERNALS__" in window) {
  setPresignedUploadAdapter(async ({ url, file, contentType }) => {
    await invoke<void>("upload_presigned_media", await file.arrayBuffer(), {
      headers: {
        "x-voople-upload-url": url,
        "x-voople-content-type": contentType,
      },
    });
  });
}

if (!root) {
  throw new Error("Desktop root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <DesktopErrorBoundary>
      <AppThemeProvider>
        <AppPreferencesProvider>
          <App />
        </AppPreferencesProvider>
      </AppThemeProvider>
    </DesktopErrorBoundary>
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    reportClientMetric({ name: "desktop-renderer-ready", value: performance.now() });
  });
});
