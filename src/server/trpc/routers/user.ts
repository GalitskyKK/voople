import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { searchAll, searchUsers } from "@/server/services/search.service";
import { getUsernameById } from "@/server/services/profile.service";

import { createTRPCRouter, optionalAuthProcedure, protectedProcedure, publicProcedure } from "../init";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const username = await getUsernameById(ctx.user.id);
    if (!username) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Профиль не создан — перезайдите в аккаунт",
      });
    }
    return { id: ctx.user.id, username };
  }),

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
