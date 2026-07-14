import { getAdminClient } from "@/lib/supabase/admin"

export async function fetchPublicUsernamesForSitemap(): Promise<
  { username: string; updated_at?: string }[]
> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from("users")
    .select("username, updated_at")
    .order("updated_at", { ascending: false })
    .limit(2000)

  if (error) {
    console.error("Error fetching public usernames for sitemap:", error.message)
    return []
  }

  return data
}
