import { withRetry } from "@/lib/supabase/retry";

import { isConnectionError } from "./connection-error";

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  return withRetry(fn, attempts, 200);
}

export { isConnectionError };
