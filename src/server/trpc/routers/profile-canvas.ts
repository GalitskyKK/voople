import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  clearProfileCanvas,
  listProfileCanvasStrokes,
  saveProfileCanvasStroke,
  undoLastOwnStroke,
} from "@/server/services/profile-canvas.service";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

const pointSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

const strokeInputSchema = z.object({
  id: z.string().uuid(),
  color: z.string().min(1).max(20),
  size: z.number().int().min(1).max(20),
  points: z.array(pointSchema).min(1).max(1000),
});

export const profileCanvasRouter = createTRPCRouter({
  listStrokes: publicProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .query(({ input }) => listProfileCanvasStrokes(input.profileUserId)),

  saveStroke: protectedProcedure
    .input(
      z.object({
        profileUserId: z.string().uuid(),
        stroke: strokeInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.canvasStroke, ctx.user.id);
      try {
        return await saveProfileCanvasStroke(input.profileUserId, ctx.user.id, {
          ...input.stroke,
          userId: ctx.user.id,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось сохранить штрих",
        });
      }
    }),

  clear: protectedProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.profileUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Очистить холст может только владелец профиля",
        });
      }
      try {
        await clearProfileCanvas(input.profileUserId, ctx.user.id);
        return { ok: true as const };
      } catch (e) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: e instanceof Error ? e.message : "Не удалось очистить холст",
        });
      }
    }),

  undoLastStroke: protectedProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await undoLastOwnStroke(input.profileUserId, ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось отменить штрих",
        });
      }
    }),
});
