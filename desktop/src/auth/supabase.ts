import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { DesktopConfig } from "../config";

let client: SupabaseClient | null = null;

export function getSupabase(config: DesktopConfig) {
  client ??= createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storageKey: "voople.desktop.session",
    },
  });
  return client;
}
