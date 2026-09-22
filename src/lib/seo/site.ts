import { MERCHANT } from "@/lib/constants/legal";

export const SITE_NAME = MERCHANT.serviceName;

export const SITE_DESCRIPTION =
  "Voople — групповой чат с живыми голосовыми комнатами и демонстрацией экрана.";

export const SITE_KEYWORDS = [
  "Voople",
  "мессенджер",
  "групповой чат",
  "голосовые комнаты",
  "демонстрация экрана",
  "общение с друзьями",
  "гостевой вход",
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
  url: "/api/og?title=Voople&subtitle=%D0%9E%D0%B4%D0%BD%D0%B0%20%D0%B3%D1%80%D1%83%D0%BF%D0%BF%D0%B0.%20%D0%9D%D0%B5%D1%81%D0%BA%D0%BE%D0%BB%D1%8C%D0%BA%D0%BE%20%D0%B6%D0%B8%D0%B2%D1%8B%D1%85%20%D1%80%D0%B0%D0%B7%D0%B3%D0%BE%D0%B2%D0%BE%D1%80%D0%BE%D0%B2.",
  width: 1200,
  height: 630,
  alt: "Voople — мессенджер для своих",
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
