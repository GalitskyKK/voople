import type { SupabaseClient } from "@supabase/supabase-js";

export { isTemporaryAuthError } from "./session-bootstrap";

export type VerifiedAuthIdentity = {
  id: string;
  email?: string;
};

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
