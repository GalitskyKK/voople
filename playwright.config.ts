import { defineConfig, devices, type Project } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";
const nextCliPath = path.resolve("node_modules/next/dist/bin/next");
// Webpack keeps the local smoke server deterministic on Windows machines where
// Turbopack's pooled PostCSS child process can be denied by the sandbox. CI
// exercises the optimized build produced by the preceding release gate.
const localDevCommand = `"${process.execPath}" "${nextCliPath}" dev --webpack --hostname 127.0.0.1`;
const localProductionCommand = `"${process.execPath}" "${nextCliPath}" start --hostname 127.0.0.1`;
const localServerCommand = process.env.CI ? localProductionCommand : localDevCommand;
const hasAuthTarget = [
  process.env.E2E_SUPABASE_URL,
  process.env.E2E_SUPABASE_ANON_KEY,
  process.env.E2E_USER_EMAIL,
].every((value) => Boolean(value?.trim()));
const hasCaptchaSafeAuth = Boolean(process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim());
const hasLocalPasswordAuth = !process.env.CI && Boolean(process.env.E2E_USER_PASSWORD?.trim());
const hasAuthenticatedProject = hasAuthTarget && (hasCaptchaSafeAuth || hasLocalPasswordAuth);

if (process.env.CI && hasAuthTarget && !hasCaptchaSafeAuth) {
  throw new Error(
    "E2E_SUPABASE_SERVICE_ROLE_KEY is required for authenticated production smoke tests",
  );
}

const projects: Project[] = [
  {
    name: "public",
    testMatch: /public\.smoke\.spec\.ts/,
    use: { ...devices["Desktop Chrome"] },
  },
];

if (hasAuthenticatedProject) {
  projects.push(
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "authenticated",
      testMatch: /authenticated\.smoke\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
    },
  );
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: localServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects,
});
