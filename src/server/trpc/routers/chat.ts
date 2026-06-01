import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  getDirectChatByUsername,
  listChats,
  listMessages,
  sendMessage,
} from "@/server/services/chat.service";

import { createTRPCRouter, protectedProcedure } from "../init";

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

  send: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        messageId: z.string().uuid(),
        text: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendMessage(input.chatId, ctx.user.id, input.text, input.messageId);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось отправить",
        });
      }
    }),
});
