import type { MetadataRoute } from "next"

import { getSiteUrl, PUBLIC_SITEMAP_PATHS } from "@/lib/seo/site"
import { fetchPublicUsernamesForSitemap } from "@/server/data/sitemap"

// Public profiles change independently of deployments. Generate the sitemap at
// request time instead of making the production build depend on Supabase.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const defaultLastModified = new Date()

  const staticSitemap = PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: defaultLastModified,
    changeFrequency: path.startsWith("/legal") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/legal") ? 0.5 : 0.8
  }))

  const users = await fetchPublicUsernamesForSitemap()

  const userSitemap = users.map((user) => ({
    url: `${siteUrl}/${user.username}`,
    lastModified: user.updated_at ? new Date(user.updated_at) : defaultLastModified,
    changeFrequency: "weekly",
    priority: 0.9
  }))

  return [...staticSitemap, ...userSitemap] as MetadataRoute.Sitemap
}
