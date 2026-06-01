import "server-only";

import { createCallerFactory, createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";

const createCaller = createCallerFactory(appRouter);

export const api = async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
};
