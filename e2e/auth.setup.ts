import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

import { PRIVACY_VERSION, TERMS_VERSION } from "../src/lib/constants/legal";

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

  if (serviceRoleKey && data.user?.id) {
    await ensureCurrentLegalConsent({
      supabaseUrl,
      serviceRoleKey,
      userId: data.user.id,
    });
  }

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

  // Verify the fixture by opening a real protected route. The idempotent setup
  // above is limited to the dedicated E2E account and does not touch user content.
  const page = await context.newPage();
  await page.goto(new URL("/settings", applicationUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible({
    timeout: 30_000,
  });

  await context.storageState({ path: authStatePath });
});

async function ensureCurrentLegalConsent({
  supabaseUrl,
  serviceRoleKey,
  userId,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
}) {
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin.from("user_legal_consents").upsert(
    {
      user_id: userId,
      privacy_version: PRIVACY_VERSION,
      terms_version: TERMS_VERSION,
      source: "web_reconsent",
    },
    {
      onConflict: "user_id,privacy_version,terms_version",
      ignoreDuplicates: true,
    },
  );
  expect(error, error?.message).toBeNull();
}

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
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);
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

function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
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
