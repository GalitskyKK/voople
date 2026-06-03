import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export function WebsiteJsonLd() {
  const siteUrl = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    inLanguage: "ru",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
