import { z } from "zod"

import { getFeedPage, getHashtagFeedPage } from "@/server/services/feed.service"

import { createTRPCRouter, publicProcedure } from "../init"

export const feedRouter = createTRPCRouter({
  getPage: publicProcedure
    .input(
      z.object({
        tab: z.enum(["overview", "following"]).default("overview"),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20)
      })
    )
    .query(async ({ input, ctx }) => {
      if (input.tab === "following") {
        return getFeedPage({
          followingOnly: true,
          viewerId: ctx.user?.id ?? null,
          cursor: input.cursor,
          limit: input.limit
        })
      }
      return getFeedPage({
        viewerId: ctx.user?.id ?? null,
        cursor: input.cursor,
        limit: input.limit
      })
    }),

  getHashtagPage: publicProcedure
    .input(
      z.object({
        tag: z.string().min(1).max(64),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20)
      })
    )
    .query(({ input, ctx }) =>
      getHashtagFeedPage({
        tag: input.tag,
        viewerId: ctx.user?.id ?? null,
        cursor: input.cursor,
        limit: input.limit
      })
    )
})
