import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { searchAll, searchUsers } from "@/server/services/search.service";
import {
  fetchCurrentUserSummary,
  setUserPresenceVisibilityRest,
  touchUserPresenceRest,
} from "@/server/data/users-rest";

import { createTRPCRouter, optionalAuthProcedure, protectedProcedure, publicProcedure } from "../init";

export const userRouter = createTRPCRouter({
  viewer: optionalAuthProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return fetchCurrentUserSummary(ctx.user.id);
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await fetchCurrentUserSummary(ctx.user.id);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Профиль не создан — перезайдите в аккаунт",
      });
    }
    return user;
  }),

  touchPresence: protectedProcedure.mutation(({ ctx }) =>
    touchUserPresenceRest(ctx.user.id)
  ),

  setPresenceVisibility: protectedProcedure
    .input(z.object({ visible: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setUserPresenceVisibilityRest(ctx.user.id, input.visible)
    ),

  checkUsername: optionalAuthProcedure
    .input(z.object({ username: z.string().min(3).max(30) }))
    .query(async ({ input, ctx }) => {
      const { isUsernameAvailable } = await import("@/server/services/user-sync.service");
      const available = await isUsernameAvailable(input.username, ctx.user?.id);
      return { available };
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      try {
        return await searchUsers(input.q);
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Ошибка поиска",
        });
      }
    }),

  searchAll: publicProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      try {
        return await searchAll(input.q);
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Ошибка поиска",
        });
      }
    }),
});
