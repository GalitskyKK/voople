import { defineConfig, devices, type Project } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";
const hasAuthenticatedProject = [
  process.env.E2E_SUPABASE_URL,
  process.env.E2E_SUPABASE_ANON_KEY,
  process.env.E2E_USER_EMAIL,
  process.env.E2E_USER_PASSWORD,
].every((value) => Boolean(value?.trim()));

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
  workers: process.env.CI ? 1 : undefined,
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
        command: "npm run dev -- --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects,
});
