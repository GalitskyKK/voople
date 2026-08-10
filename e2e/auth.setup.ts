import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { expect, test as setup } from "@playwright/test";

const authStatePath = "playwright/.auth/user.json";

type StoredCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

setup("create an isolated authenticated browser state", async ({ context, baseURL }) => {
  const supabaseUrl = requiredEnvironmentValue("E2E_SUPABASE_URL");
  const supabaseAnonKey = requiredEnvironmentValue("E2E_SUPABASE_ANON_KEY");
  const email = requiredEnvironmentValue("E2E_USER_EMAIL");
  const password = requiredEnvironmentValue("E2E_USER_PASSWORD");
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  await context.storageState({ path: authStatePath });
});

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for authenticated E2E tests`);
  return value;
}

function normalizeSameSite(value: CookieOptions["sameSite"]): "Strict" | "Lax" | "None" {
  if (typeof value !== "string") return "Lax";
  const normalized = value.toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
}
