import { MERCHANT } from "@/lib/constants/legal";

export const SITE_NAME = MERCHANT.serviceName;

export const SITE_DESCRIPTION =
  "Voople — mood-first социальная сеть: делитесь настроением, музыкой, мыслями и кружками, реагируйте на друзей и собирайте живой профиль.";

export const SITE_KEYWORDS = [
  "Voople",
  "социальная сеть",
  "профиль",
  "лента",
  "кастомизация профиля",
  "настроение",
  "mood",
  "кружки",
  "музыка в профиле",
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
  url: "/api/og?title=Voople&subtitle=%D0%A2%D0%B2%D0%BE%D0%B9%20%D0%BC%D1%83%D0%B4.%20%D0%A2%D0%B2%D0%BE%D0%B9%20%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8C.%20%D0%A2%D0%B2%D0%BE%D0%B8%20%D0%BB%D1%8E%D0%B4%D0%B8.",
  width: 1200,
  height: 630,
  alt: "Voople — mood-first социальная сеть",
} as const;

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/shop",
  "/events",
  "/legal/privacy",
  "/legal/services",
  "/legal/delivery",
  "/legal/offer",
  "/legal/terms",
  "/legal/contacts",
] as const;
