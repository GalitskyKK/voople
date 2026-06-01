import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { getTrendingHashtags, searchExplore } from "@/server/services/search.service"

import { createTRPCRouter, publicProcedure } from "../init"

export const searchRouter = createTRPCRouter({
  explore: publicProcedure
    .input(z.object({ q: z.string().max(50) }))
    .query(async ({ ctx, input }) => {
      try {
        return await searchExplore(input.q, ctx.user?.id)
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Ошибка поиска"
        })
      }
    }),

  trendingHashtags: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }).optional())
    .query(async ({ input }) => {
      try {
        return await getTrendingHashtags(input?.limit ?? 10)
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Не удалось загрузить тренды"
        })
      }
    })
})
