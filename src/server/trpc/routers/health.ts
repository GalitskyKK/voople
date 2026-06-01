import { createTRPCRouter, publicProcedure } from "../init";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(() => ({ ok: true as const })),
});
