import type { Metadata } from "next";

import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_ICONS,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE,
} from "@/lib/seo/site";

/** OG-картинка через динамический /api/og. Возвращает относительный URL (резолвится metadataBase). */
export function ogImageUrl(params: { title: string; subtitle?: string; badge?: string }): string {
  const query = new URLSearchParams({ title: params.title });
  if (params.subtitle) query.set("subtitle", params.subtitle);
  if (params.badge) query.set("badge", params.badge);
  return `/api/og?${query.toString()}`;
}

function cleanSeoText(value: string, maxLength = 155): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Метаданные страницы профиля с динамической OG-картинкой (важно для виральности ask-ссылок). */
export function createProfileMetadata(input: {
  displayName: string;
  username: string;
  bio?: string | null;
  ask?: boolean;
}): Metadata {
  const title = input.ask
    ? `Спроси ${input.displayName} анонимно`
    : `${input.displayName} (@${input.username})`;
  const description = cleanSeoText(input.ask
    ? `Задай ${input.displayName} (@${input.username}) анонимный вопрос в Voople`
    : input.bio?.trim()
      ? `${input.bio.trim()} Профиль @${input.username} в Voople: настроение, публикации и реакции.`
      : `Живой профиль @${input.username} в Voople: настроение, публикации, музыка и реакции друзей.`);
  const image = ogImageUrl({
    title: input.ask ? `Спроси меня анонимно` : input.displayName,
    subtitle: `@${input.username}`,
    badge: input.ask ? "Анонимные вопросы" : undefined,
  });

  return {
    title,
    description,
    alternates: { canonical: `/${input.username}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/${input.username}`,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

function siteVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();
  if (!google && !yandex) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
  };
}

export function createRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const defaultTitle = `${SITE_NAME} — поделись своим настроением`;
  const verification = siteVerification();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "social",
    icons: SITE_ICONS,
    manifest: "/favicon/site.webmanifest",
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: siteUrl,
      siteName: SITE_NAME,
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: SITE_DESCRIPTION,
      images: [SITE_OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    ...(verification ? { verification } : {}),
  };
}
