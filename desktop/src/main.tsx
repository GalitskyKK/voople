import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";

import { App } from "./App";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { setPresignedUploadAdapter } from "@/lib/uploads/presigned-upload";
import "../../src/app/globals.css";
import "./styles.css";

const root = document.getElementById("root");

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
    <AppThemeProvider>
      <AppPreferencesProvider>
        <App />
      </AppPreferencesProvider>
    </AppThemeProvider>
  </StrictMode>,
);
