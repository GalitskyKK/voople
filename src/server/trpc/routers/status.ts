import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  publishStatusToFeed,
  saveUserStatus,
} from "@/server/services/status.service";

import { createTRPCRouter, protectedProcedure } from "../init";

const statusSchema = z.object({
  moodValue: z.number().int().min(1).max(10).nullable().optional(),
  thought: z.string().max(80).nullable().optional(),
  trackTitle: z.string().max(100).nullable().optional(),
  trackArtist: z.string().max(100).nullable().optional(),
});

export const statusRouter = createTRPCRouter({
  save: protectedProcedure.input(statusSchema).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.updateStatus, ctx.user.id);
    try {
      return await saveUserStatus(ctx.user.id, input);
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Не удалось сохранить состояние",
      });
    }
  }),

  publishToFeed: protectedProcedure
    .input(statusSchema)
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.updateStatus, ctx.user.id);
      try {
        return await publishStatusToFeed(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось опубликовать",
        });
      }
    }),
});
