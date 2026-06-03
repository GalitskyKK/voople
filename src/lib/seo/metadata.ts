import type { Metadata } from "next";

import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_ICONS,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE,
} from "@/lib/seo/site";

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
  const defaultTitle = `${SITE_NAME} — социальная сеть с живыми профилями`;
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
    alternates: {
      canonical: "/",
    },
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
      card: "summary",
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
