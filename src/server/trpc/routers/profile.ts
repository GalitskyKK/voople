import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { assertRateLimit } from "@/lib/ratelimit-guard"
import { rateLimits } from "@/lib/ratelimit"
import { getFollowState, toggleFollow } from "@/server/services/follow.service"
import {
  PROFILE_REACTION_EMOJIS,
  listProfileReactions,
  toggleProfileReaction
} from "@/server/services/profile-reactions.service"
import { updateUserProfile } from "@/server/services/profile-update.service"
import { getPostsByUsername, getProfileByUsername } from "@/server/services/profile.service"
import { recordProfileView } from "@/server/services/views.service"

import { createTRPCRouter, optionalAuthProcedure, protectedProcedure, publicProcedure } from "../init"

export const profileRouter = createTRPCRouter({
  getByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .query(async ({ input }) => {
      const profile = await getProfileByUsername(input.username)
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" })
      }
      return profile
    }),

  getPostsByUsername: optionalAuthProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .query(({ input, ctx }) => getPostsByUsername(input.username, ctx.user?.id ?? null)),

  getFollowState: optionalAuthProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .query(async ({ input, ctx }) => {
      const profile = await getProfileByUsername(input.username)
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" })
      }
      return getFollowState(ctx.user?.id ?? null, profile.id)
    }),

  getReactions: optionalAuthProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .query(({ input, ctx }) => listProfileReactions(input.profileUserId, ctx.user?.id ?? null)),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(50).optional(),
        bio: z.string().max(100).nullable().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.displayName && input.bio === undefined) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Нечего обновлять" })
      }
      try {
        return await updateUserProfile(ctx.user.id, input)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить профиль"
        })
      }
    }),

  toggleFollow: protectedProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .mutation(async ({ input, ctx }) => {
      const profile = await getProfileByUsername(input.username)
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" })
      }
      await assertRateLimit(rateLimits.follow, ctx.user.id)
      try {
        return await toggleFollow(ctx.user.id, profile.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось изменить подписку"
        })
      }
    }),

  toggleReaction: protectedProcedure
    .input(
      z.object({
        profileUserId: z.string().uuid(),
        emoji: z.enum(PROFILE_REACTION_EMOJIS)
      })
    )
    .mutation(({ input, ctx }) =>
      toggleProfileReaction(input.profileUserId, ctx.user.id, input.emoji)
    ),

  view: protectedProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await recordProfileView(input.profileUserId, ctx.user.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось записать просмотр профиля"
        })
      }
    })
})
