"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { useState } from "react";

import { assertJsonResponse } from "@/lib/http/json-response";
import type { AppRouter } from "@/server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();

const DEFAULT_QUERY_STALE_TIME_MS = 30_000;

function getHttpStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    data?: { httpStatus?: unknown };
    shape?: { data?: { httpStatus?: unknown } };
  };
  const value = candidate.data?.httpStatus ?? candidate.shape?.data?.httpStatus;
  return typeof value === "number" ? value : null;
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = getHttpStatus(error);
  if (status && [400, 401, 403, 404].includes(status)) return false;
  return failureCount < 2;
}

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  const runtimeEnv = runtimeProcess?.env;
  if (runtimeEnv?.NEXT_PUBLIC_APP_URL) return runtimeEnv.NEXT_PUBLIC_APP_URL;
  return `http://localhost:${runtimeEnv?.PORT ?? 3000}`;
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
            retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3_000),
            staleTime: DEFAULT_QUERY_STALE_TIME_MS,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          fetch: async (url, options) => {
            const response = await fetch(url, {
              ...options,
              credentials: "include",
            });
            return assertJsonResponse(response);
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
