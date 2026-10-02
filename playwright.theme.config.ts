import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", testMatch: ["style-app-theme.spec.ts", "style-nickname-font.spec.ts", "style-nickname-effect.spec.ts"], fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:1430" },
  webServer: { command: "node desktop/node_modules/vite/bin/vite.js e2e/theme-harness --config desktop/vite.config.ts --port 1430 --strictPort",
    url: "http://127.0.0.1:1430", reuseExistingServer: false, timeout: 60_000 },
});
