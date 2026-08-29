import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { resolveAuthSessionBootstrap } from "@/lib/supabase/session-bootstrap";

/** One authoritative optional viewer lookup per Server Component render pass. */
export const getServerAuthBootstrap = cache(async () => {
  const supabase = await createClient();
  return resolveAuthSessionBootstrap<User>(async () => {
    const { data, error } = await supabase.auth.getUser();
    return { value: data.user, error };
  });
});
