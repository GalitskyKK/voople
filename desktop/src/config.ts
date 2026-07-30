export type DesktopConfig = {
  apiUrl: string;
  assetsCdnUrl?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
  turnstileSiteKey?: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getDesktopConfig(): DesktopConfig | null {
  const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const supabaseAnonKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  const explicitApiUrl = import.meta.env.VITE_VOOPLE_API_URL?.trim();
  const localApiUrl = import.meta.env.NEXT_PUBLIC_APP_URL?.trim();
  const apiUrl =
    explicitApiUrl ??
    (import.meta.env.DEV ? localApiUrl || "http://127.0.0.1:3000" : "https://voople.ru");
  const turnstileSiteKey = (
    import.meta.env.VITE_TURNSTILE_SITE_KEY ??
    import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  )?.trim();
  const assetsCdnUrl = import.meta.env.NEXT_PUBLIC_ASSETS_CDN_URL?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !apiUrl) return null;

  return {
    apiUrl: trimTrailingSlash(apiUrl),
    assetsCdnUrl: assetsCdnUrl ? trimTrailingSlash(assetsCdnUrl) : undefined,
    supabaseAnonKey,
    supabaseUrl: trimTrailingSlash(supabaseUrl),
    turnstileSiteKey: turnstileSiteKey || undefined,
  };
}
