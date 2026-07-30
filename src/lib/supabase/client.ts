import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFetchWithRetry } from "./fetch-retry";

let browserClient: SupabaseClient | null = null;

function createBrowserSupabaseFetch(upstreamUrl: string): typeof fetch {
  const fetchWithRetry = createFetchWithRetry(3, 10_000);
  const upstreamOrigin = new URL(upstreamUrl).origin;

  return async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
      window.location.origin,
    );
    if (url.origin !== upstreamOrigin) return fetchWithRetry(input, init);

    const proxyUrl = new URL(`/api/supabase${url.pathname}`, window.location.origin);
    proxyUrl.search = url.search;
    const proxyResponse = await fetchWithRetry(proxyUrl, init);
    if (proxyResponse.status !== 502 && proxyResponse.status !== 503) {
      return proxyResponse;
    }

    // Local development can share the same blocked route to Supabase as the
    // browser. Keep the direct endpoint as a fallback for VPN/custom-DNS setups.
    return fetchWithRetry(input, init);
  };
}

export function createClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  browserClient = createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: createBrowserSupabaseFetch(supabaseUrl) } },
  );
  return browserClient;
}
