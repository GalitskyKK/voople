import type { SupabaseClient } from "@supabase/supabase-js";

export type VerifiedAuthIdentity = {
  id: string;
  email?: string;
};

export function isTemporaryAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const value = error as { message?: string; status?: number; code?: string };
  const message = value.message?.toLowerCase() ?? "";
  return (
    value.status === 0 ||
    (typeof value.status === "number" && value.status >= 500) ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("jwt issued at future")
  );
}

/**
 * Verifies the access token signature and expiry without requesting /auth/v1/user
 * on every application query. With asymmetric Supabase signing keys the JWKS is
 * cached and subsequent checks are local.
 */
export async function getVerifiedAuthIdentity(
  supabase: SupabaseClient,
  accessToken?: string,
): Promise<VerifiedAuthIdentity | null> {
  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error) throw error;

  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}
