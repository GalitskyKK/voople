import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";

const handler = async (req: Request) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ request: req }),
  });
  return withDesktopCors(req, response);
};

export { handler as GET, handler as POST };

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
