import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  answerQuestion,
  askQuestion,
  countInboxQuestions,
  hideQuestion,
  listAnsweredQuestions,
  listQuestionInbox,
  shareAnswerToFeed,
  QUESTION_MAX_LENGTH,
  ANSWER_MAX_LENGTH,
} from "@/server/services/questions.service";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const questionsRouter = createTRPCRouter({
  /** Публичная лента отвеченных вопросов профиля. */
  listAnswered: publicProcedure
    .input(z.object({ profileUserId: z.string().uuid() }))
    .query(({ input }) => listAnsweredQuestions(input.profileUserId)),

  /**
   * Задать анонимный вопрос. Только залогиненные (askerId хранится, но владельцу
   * не отдаётся). Запрет на вопрос самому себе.
   */
  ask: protectedProcedure
    .input(
      z.object({
        profileUserId: z.string().uuid(),
        text: z.string().trim().min(1).max(QUESTION_MAX_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.profileUserId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Нельзя спросить самого себя" });
      }
      await assertRateLimit(rateLimits.askQuestion, ctx.user.id);
      try {
        return await askQuestion(input.profileUserId, ctx.user.id, input.text);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось отправить вопрос",
        });
      }
    }),

  /** Инбокс владельца: неотвеченные вопросы. */
  listInbox: protectedProcedure.query(({ ctx }) => listQuestionInbox(ctx.user.id)),

  inboxCount: protectedProcedure.query(({ ctx }) => countInboxQuestions(ctx.user.id)),

  /** Ответить на вопрос (владелец). Публикует ответ в публичную ленту. */
  answer: protectedProcedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        text: z.string().trim().min(1).max(ANSWER_MAX_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await answerQuestion(ctx.user.id, input.questionId, input.text);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось ответить",
        });
      }
    }),

  /** Опубликовать отвеченный вопрос как пост в ленту (виральная петля). */
  shareToFeed: protectedProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createPost, ctx.user.id);
      try {
        return await shareAnswerToFeed(ctx.user.id, input.questionId);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось поделиться",
        });
      }
    }),

  /** Удалить вопрос (владелец) — убирает из инбокса и из ленты. */
  hide: protectedProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await hideQuestion(ctx.user.id, input.questionId);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось удалить вопрос",
        });
      }
    }),
});
