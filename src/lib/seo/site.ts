import { MERCHANT } from "@/lib/constants/legal";

export const SITE_NAME = MERCHANT.serviceName;

export const SITE_DESCRIPTION =
  "Социальная сеть с живыми профилями, лентой публикаций, сообщениями и магазином цифровой кастомизации.";

export const SITE_KEYWORDS = [
  "Voople",
  "социальная сеть",
  "профиль",
  "лента",
  "кастомизация профиля",
] as const;

/** Публичный origin для canonical, Open Graph и sitemap. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return MERCHANT.siteUrl;
}

export const FAVICON_BASE = "/favicon";

export const SITE_ICONS = {
  icon: [
    { url: `${FAVICON_BASE}/favicon.ico` },
    { url: `${FAVICON_BASE}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
    { url: `${FAVICON_BASE}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
  ],
  apple: `${FAVICON_BASE}/apple-touch-icon.png`,
};

export const SITE_OG_IMAGE = {
  url: `${FAVICON_BASE}/android-chrome-512x512.png`,
  width: 512,
  height: 512,
  alt: SITE_NAME,
} as const;

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/login",
  "/register",
  "/feed",
  "/explore",
  "/shop",
  "/legal/services",
  "/legal/delivery",
  "/legal/offer",
  "/legal/terms",
  "/legal/contacts",
] as const;
