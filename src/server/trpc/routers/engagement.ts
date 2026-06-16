import { z } from "zod";

import { getStreak, listUserBadges, pingStreak } from "@/server/services/engagement.service";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const engagementRouter = createTRPCRouter({
  /** Отметить активность за сегодня и получить актуальный стрик (вызывается при заходе). */
  pingStreak: protectedProcedure.mutation(({ ctx }) => pingStreak(ctx.user.id)),

  /** Текущий стрик без изменения (для отображения). */
  myStreak: protectedProcedure.query(({ ctx }) => getStreak(ctx.user.id)),

  /** Заработанные бейджи пользователя (публично — для профиля). */
  badges: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(({ input }) => listUserBadges(input.userId)),
});
