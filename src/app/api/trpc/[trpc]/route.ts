import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";

const handler = async (req: Request) => {
  const startedAt = performance.now();
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ request: req }),
  });
  const headers = new Headers(response.headers);
  headers.set("server-timing", `trpc;dur=${(performance.now() - startedAt).toFixed(1)}`);
  return withDesktopCors(req, new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
};

export { handler as GET, handler as POST };

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
