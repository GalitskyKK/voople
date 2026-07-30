import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import "../../src/app/globals.css";
import "./styles.css";

const root = document.getElementById("root");

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
