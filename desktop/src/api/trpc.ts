import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import superjson from "superjson";

import type { DesktopConfig } from "../config";

export function createDesktopTrpcClient(
  config: DesktopConfig,
  getAccessToken: () => string | null,
) {
  return createTRPCUntypedClient<AnyRouter>({
    links: [
      httpBatchLink({
        url: `${config.apiUrl}/api/trpc`,
        transformer: superjson,
        headers: () => {
          const accessToken = getAccessToken();
          return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        },
      }),
    ],
  });
}
