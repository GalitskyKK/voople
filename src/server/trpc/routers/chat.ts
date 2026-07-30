import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import {
  acceptChatInvite,
  createChatInvite,
  createChatRoomMediaToken,
  declineChatRoomCall,
  deleteMessage,
  createGroupChat,
  enterChatRoom,
  getDirectChatByUsername,
  getChatRoom,
  heartbeatChatRoom,
  leaveChatRoom,
  listIncomingCalls,
  listChats,
  listMessages,
  markMessagesRead,
  previewChatInvite,
  revokeChatInvite,
  sendMessage,
  setChatRoomAccess,
  toggleMessageReaction,
} from "@/server/services/chat.service";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

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
  invitePreview: publicProcedure
    .input(z.object({ token: z.string().min(20).max(100) }))
    .query(async ({ input }) => {
      try {
        return await previewChatInvite(input.token);
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ссылка недоступна" });
      }
    }),

  createInvite: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createChatInvite, ctx.user.id);
      try {
        return await createChatInvite(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось создать ссылку",
        });
      }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(20).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.acceptChatInvite, ctx.user.id);
      try {
        return await acceptChatInvite(input.token, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось вступить в группу",
        });
      }
    }),

  revokeInvite: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), token: z.string().min(20).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createChatInvite, ctx.user.id);
      try {
        return await revokeChatInvite(input.chatId, ctx.user.id, input.token);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось отозвать ссылку",
        });
      }
    }),

  room: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getChatRoom(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось загрузить комнату",
        });
      }
    }),

  enterRoom: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), micMuted: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        return await enterChatRoom(input.chatId, ctx.user.id, input.micMuted);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось войти в комнату",
        });
      }
    }),

  roomMediaToken: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        return await createChatRoomMediaToken(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось подключить голос",
        });
      }
    }),

  incomingCalls: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listIncomingCalls(ctx.user.id);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось проверить входящие звонки",
      });
    }
  }),

  declineCall: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        return await declineChatRoomCall(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось отклонить звонок",
        });
      }
    }),

  heartbeatRoom: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), micMuted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await heartbeatChatRoom(input.chatId, ctx.user.id, input.micMuted);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Связь с комнатой потеряна",
        });
      }
    }),

  leaveRoom: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await leaveChatRoom(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось выйти из комнаты",
        });
      }
    }),

  setRoomAccess: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), accessMode: z.enum(["open", "locked"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await setChatRoomAccess(input.chatId, ctx.user.id, input.accessMode);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить доступ",
        });
      }
    }),

  createGroup: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(50), memberIds: z.array(z.string().uuid()).min(2).max(19) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createGroupChat, ctx.user.id);
      try {
        return await createGroupChat(ctx.user.id, input.name, input.memberIds);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось создать группу" });
      }
    }),
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

  toggleReaction: protectedProcedure
    .input(z.object({ messageId: z.string().uuid(), emoji: z.enum(CHAT_REACTION_EMOJIS) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.like, ctx.user.id);
      try {
        return await toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось изменить реакцию",
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
