import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { checkLinkSafety } from "@/server/services/link-safety.service";
import { createTRPCRouter, optionalAuthProcedure } from "../init";

export const linkSafetyRouter = createTRPCRouter({
  check: optionalAuthProcedure
    .input(z.object({ url: z.string().trim().min(4).max(2_048) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.checkLinkSafety, ctx.user?.id ?? "anonymous");
      try {
        return await checkLinkSafety(input.url);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось проверить ссылку",
        });
      }
    }),
});
