import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

const authStatePath = "playwright/.auth/user.json";

type StoredCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

setup("create an isolated authenticated browser state", async ({ context, baseURL }) => {
  setup.setTimeout(90_000);
  const supabaseUrl = requiredEnvironmentValue("E2E_SUPABASE_URL");
  const supabaseAnonKey = requiredEnvironmentValue("E2E_SUPABASE_ANON_KEY");
  const email = requiredEnvironmentValue("E2E_USER_EMAIL");
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const password = process.env.E2E_USER_PASSWORD?.trim();
  const applicationUrl = new URL(baseURL ?? requiredEnvironmentValue("PLAYWRIGHT_BASE_URL"));
  const cookieJar = new Map<string, StoredCookie>();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => [...cookieJar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (cookies) => {
        for (const cookie of cookies) cookieJar.set(cookie.name, cookie);
      },
    },
  });

  const { data, error } = serviceRoleKey
    ? await createCaptchaSafeTestSession({
        supabase,
        supabaseUrl,
        serviceRoleKey,
        email,
      })
    : await supabase.auth.signInWithPassword({
        email,
        password: requiredFallbackPassword(password),
      });
  expect(error, error?.message).toBeNull();
  expect(data.user?.id).toBeTruthy();

  await context.addCookies(
    [...cookieJar.values()].map(({ name, value, options }) => ({
      name,
      value,
      url: applicationUrl.origin,
      httpOnly: options.httpOnly,
      secure: applicationUrl.protocol === "https:" || options.secure,
      sameSite: normalizeSameSite(options.sameSite),
      expires:
        typeof options.maxAge === "number"
          ? Math.floor(Date.now() / 1000) + options.maxAge
          : undefined,
    })),
  );

  // Legal document versions may change independently of the dedicated E2E
  // account. Confirm them through the real UI so protected smoke tests verify
  // the application surface instead of stopping at the re-consent boundary.
  const page = await context.newPage();
  await page.goto(new URL("/settings", applicationUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const settingsHeading = page.getByRole("heading", { name: "Настройки" });
  const consentHeading = page.getByRole("heading", {
    name: "Проверьте актуальные условия",
  });
  await expect(settingsHeading.or(consentHeading)).toBeVisible({ timeout: 30_000 });

  if (await consentHeading.isVisible()) {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Принять и продолжить" }).click();
    await expect(settingsHeading).toBeVisible({ timeout: 30_000 });
  }

  await context.storageState({ path: authStatePath });
});

async function createCaptchaSafeTestSession({
  supabase,
  supabaseUrl,
  serviceRoleKey,
  email,
}: {
  supabase: ReturnType<typeof createServerClient>;
  supabaseUrl: string;
  serviceRoleKey: string;
  email: string;
}) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  // Recovery links fail for unknown users, unlike magic links which may create one.
  // That makes a typo in E2E_USER_EMAIL fail closed instead of mutating production Auth.
  const generated = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (generated.error || !generated.data.properties.hashed_token) {
    throw generated.error ?? new Error("Supabase did not return an E2E login token");
  }
  return supabase.auth.verifyOtp({
    token_hash: generated.data.properties.hashed_token,
    type: "recovery",
  });
}

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for authenticated E2E tests`);
  return value;
}

function requiredFallbackPassword(password: string | undefined) {
  if (password) return password;
  throw new Error(
    "E2E_SUPABASE_SERVICE_ROLE_KEY is required when CAPTCHA protects production authentication",
  );
}

function normalizeSameSite(value: CookieOptions["sameSite"]): "Strict" | "Lax" | "None" {
  if (typeof value !== "string") return "Lax";
  const normalized = value.toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
}
