import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { DesktopConfig } from "../config";
import { createFetchWithRetry } from "@/lib/supabase/fetch-retry";

let client: SupabaseClient | null = null;

export function getSupabase(config: DesktopConfig) {
  client ??= createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storageKey: "voople.desktop.session",
    },
    global: { fetch: createFetchWithRetry(2, 8_000) },
  });
  return client;
}
