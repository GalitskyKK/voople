import { getSiteUrl, SITE_NAME } from "@/lib/seo/site";

export function ProfileJsonLd({
  displayName,
  username,
  bio,
}: {
  displayName: string;
  username: string;
  bio?: string | null;
}) {
  const siteUrl = getSiteUrl();
  const profileUrl = `${siteUrl}/${username}`;
  const payload = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profile`,
    url: profileUrl,
    name: `${displayName} (@${username}) — профиль в ${SITE_NAME}`,
    description: bio?.trim() || `Профиль @${username} в ${SITE_NAME}`,
    inLanguage: "ru-RU",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: `@${username}`,
      url: profileUrl,
    },
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }}
    />
  );
}
