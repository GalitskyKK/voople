import { z } from "zod";

import { chooseTeamPin, getStreak, listUserBadges, pingStreak } from "@/server/services/engagement.service";

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

  myBadges: protectedProcedure.query(({ ctx }) => listUserBadges(ctx.user.id)),

  chooseTeam: protectedProcedure
    .input(
      z.object({
        answers: z.array(z.enum(["team-pulse", "team-orbit", "team-forge", "team-echo"])).length(5),
      }),
    )
    .mutation(({ ctx, input }) => chooseTeamPin(ctx.user.id, input.answers)),
});
