import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { createFetchWithRetry } from "./fetch-retry"

let cached: SupabaseClient | null = null

/**
 * Service Role — серверные REST-запросы (профиль, лента, чат, лайки, уведомления).
 * Не используйте в браузере. Drizzle — только миграции / редкие админ-задачи.
 */
export function getAdminClient() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("В .env.local нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY")
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createFetchWithRetry() }
  })
  return cached
}
