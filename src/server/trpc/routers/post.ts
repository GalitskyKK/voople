import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { assertRateLimit } from "@/lib/ratelimit-guard"
import { rateLimits } from "@/lib/ratelimit"
import { createComment, deleteComment, listComments } from "@/server/services/comments.service"
import { toggleLike } from "@/server/services/likes.service"
import { createPost, createPostReport, getPostById, updatePostText } from "@/server/services/post.service"
import { createRepost, toggleRepost } from "@/server/services/reposts.service"
import { recordPostView } from "@/server/services/views.service"

import { createTRPCRouter, optionalAuthProcedure, protectedProcedure } from "../init"

export const postRouter = createTRPCRouter({
  getById: optionalAuthProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const post = await getPostById(input.postId, ctx.user?.id)
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Пост не найден" })
      }
      return post
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: z.string().max(280, "Максимум 280 символов").optional(),
        mediaKey: z.string().min(1).max(500).optional(),
        mediaType: z.enum(["image", "gif", "meme", "video", "circle"]).optional(),
        appearanceScene: z.enum(["midnight", "aurora", "paper"]).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createPost, ctx.user.id)
      try {
        return await createPost(ctx.user.id, input)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось опубликовать"
        })
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        text: z.string().min(1).max(280),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePostText(ctx.user.id, input.postId, input.text)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить пост",
        })
      }
    }),

  report: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createPost, ctx.user.id)
      try {
        return await createPostReport(ctx.user.id, input.postId, input.reason)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось отправить жалобу",
        })
      }
    }),

  like: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.like, ctx.user.id)
      try {
        return await toggleLike(input.postId, ctx.user.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось поставить лайк"
        })
      }
    }),

  view: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordPostView(input.postId, ctx.user.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось записать просмотр"
        })
      }
    }),

  listComments: optionalAuthProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(({ ctx, input }) => listComments(input.postId, ctx.user?.id)),

  createComment: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        text: z.string().max(280, "Максимум 280 символов").optional(),
        mediaKey: z.string().min(1).max(500).optional(),
        mediaType: z.enum(["image", "gif", "meme", "video", "circle"]).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.comment, ctx.user.id)
      try {
        return await createComment(input.postId, ctx.user.id, input)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось создать комментарий"
        })
      }
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteComment(input.commentId, ctx.user.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось удалить комментарий"
        })
      }
    }),

  repost: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.repost, ctx.user.id)
      try {
        return await toggleRepost(input.postId, ctx.user.id)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось сделать репост"
        })
      }
    }),

  quoteRepost: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        comment: z.string().min(1, "Введите комментарий").max(280, "Максимум 280 символов")
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.repost, ctx.user.id)
      try {
        return await createRepost(input.postId, ctx.user.id, input.comment)
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось сделать репост"
        })
      }
    })
})
