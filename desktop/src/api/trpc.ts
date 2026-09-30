import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import superjson from "superjson";

import type { DesktopConfig } from "../config";
import { desktopApiFetch, desktopRequestHeaders } from "./desktop-request";

export function createDesktopTrpcClient(
  config: DesktopConfig,
  getAccessToken: () => string | null,
) {
  return createTRPCUntypedClient<AnyRouter>({
    links: [
      httpBatchLink({
        url: `${config.apiUrl}/api/trpc`,
        transformer: superjson,
        headers: async () => {
          const accessToken = getAccessToken();
          return { ...(await desktopRequestHeaders()), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
        },
        fetch: desktopApiFetch,
      }),
    ],
  });
}
