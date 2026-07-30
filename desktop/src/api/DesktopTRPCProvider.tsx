import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type { Session } from "@supabase/supabase-js";
import { useMemo, useState, type ReactNode } from "react";
import superjson from "superjson";

import { assertJsonResponse } from "@/lib/http/json-response";
import { trpc } from "@/lib/trpc/client";

import type { DesktopConfig } from "../config";

function getHttpStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    data?: { httpStatus?: unknown };
    shape?: { data?: { httpStatus?: unknown } };
  };
  const value = candidate.data?.httpStatus ?? candidate.shape?.data?.httpStatus;
  return typeof value === "number" ? value : null;
}

export function DesktopTRPCProvider({
  children,
  config,
  session,
}: {
  children: ReactNode;
  config: DesktopConfig;
  session: Session;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = getHttpStatus(error);
              if (status && [400, 401, 403, 404].includes(status)) return false;
              return failureCount < 2;
            },
            retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3_000),
            staleTime: 30_000,
          },
        },
      }),
  );
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${config.apiUrl}/api/trpc`,
            transformer: superjson,
            headers: () => ({
              Authorization: `Bearer ${session.access_token}`,
            }),
            fetch: async (url, options) =>
              assertJsonResponse(await fetch(url, options)),
          }),
        ],
      }),
    [config.apiUrl, session.access_token],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
