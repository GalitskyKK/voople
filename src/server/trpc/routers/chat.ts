import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  deleteMessage,
  getDirectChatByUsername,
  listChats,
  listMessages,
  markMessagesRead,
  sendMessage,
} from "@/server/services/chat.service";

import { createTRPCRouter, protectedProcedure } from "../init";

const sendInputSchema = z
  .object({
    chatId: z.string().uuid(),
    messageId: z.string().uuid(),
    text: z.string().max(1000).optional(),
    mediaKey: z.string().min(10).max(500).optional(),
    mediaTitle: z.string().min(1).max(100).optional(),
    mediaArtist: z.string().min(1).max(100).optional(),
    sharedTrackId: z.string().uuid().optional(),
    replyToMessageId: z.string().uuid().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.text?.trim()) || Boolean(value.mediaKey) || Boolean(value.sharedTrackId),
    { message: "Добавьте текст или вложение" },
  );

export const chatRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listChats(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "Не удалось загрузить чаты",
      });
    }
  }),

  openDirect: protectedProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await getDirectChatByUsername(ctx.user.id, input.username);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось открыть чат",
        });
      }
    }),

  getMessages: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listMessages(input.chatId, ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось загрузить сообщения",
        });
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await markMessagesRead(input.chatId, ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить статус прочтения",
        });
      }
    }),

  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMessage(input.messageId, ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось удалить сообщение",
        });
      }
    }),

  send: protectedProcedure.input(sendInputSchema).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
    try {
      return await sendMessage({
        chatId: input.chatId,
        messageId: input.messageId,
        senderId: ctx.user.id,
        text: input.text,
        mediaKey: input.mediaKey,
        mediaTitle: input.mediaTitle,
        mediaArtist: input.mediaArtist,
        sharedTrackId: input.sharedTrackId,
        replyToMessageId: input.replyToMessageId,
      });
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Не удалось отправить",
      });
    }
  }),
});
