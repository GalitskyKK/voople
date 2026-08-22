import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  deleteMessage,
  editMessage,
  getDirectChatByUsername,
  listMessages,
  markMessagesRead,
  sendMessage,
  toggleMessageReaction,
} from "@/server/services/chat.service";
import {
  markReplyRecipientActivation,
  recordServerProductEvent,
} from "@/server/services/client-telemetry.service";
import { protectedProcedure } from "../init";
import { sendChatMessageInputSchema } from "../schemas/chat-message";

export const chatMessageProcedures = {
  openDirect: protectedProcedure.input(z.object({ username: z.string().min(1).max(30) })).mutation(async ({ ctx, input }) => {
    try { return await getDirectChatByUsername(ctx.user.id, input.username); }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось открыть чат" }); }
  }),
  getMessages: protectedProcedure.input(z.object({ chatId: z.string().uuid() })).query(async ({ ctx, input }) => {
    try { return await listMessages(input.chatId, ctx.user.id); }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось загрузить сообщения" }); }
  }),
  markRead: protectedProcedure.input(z.object({ chatId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    try { return await markMessagesRead(input.chatId, ctx.user.id); }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось обновить статус прочтения" }); }
  }),
  deleteMessage: protectedProcedure.input(z.object({ messageId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    try { return await deleteMessage(input.messageId, ctx.user.id); }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось удалить сообщение" }); }
  }),
  editMessage: protectedProcedure.input(z.object({ messageId: z.string().uuid(), text: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.openDirectChat, ctx.user.id);
    await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
    try { return await editMessage(input.messageId, ctx.user.id, input.text); }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось изменить сообщение" }); }
  }),
  toggleReaction: protectedProcedure.input(z.object({
    messageId: z.string().uuid(),
    emoji: z.enum(CHAT_REACTION_EMOJIS).optional(),
    emojiId: z.string().uuid().optional(),
  }).refine((value) => Boolean(value.emoji) !== Boolean(value.emojiId), { message: "Выберите одну реакцию" })).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.like, ctx.user.id);
    try {
      const result = await toggleMessageReaction(input.messageId, ctx.user.id, { emoji: input.emoji, emojiId: input.emojiId });
      await recordServerProductEvent({ name: "reaction_used", actorId: ctx.user.id, route: "/trpc/chat.toggleReaction" });
      return result;
    } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось изменить реакцию" }); }
  }),
  send: protectedProcedure.input(sendChatMessageInputSchema).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
    try {
      const result = await sendMessage({ ...input, senderId: ctx.user.id });
      await recordServerProductEvent({
        name: "message_sent",
        actorId: ctx.user.id,
        route: "/trpc/chat.send",
        properties: { hasAttachment: Boolean(input.mediaKey || input.sharedTrackId), hasReply: Boolean(input.replyToMessageId) },
      });
      if (input.replyToMessageId) {
        await recordServerProductEvent({ name: "message_replied", actorId: ctx.user.id, route: "/trpc/chat.send" });
        await markReplyRecipientActivation(input.replyToMessageId);
      }
      if (input.mediaKey || input.sharedTrackId) {
        await recordServerProductEvent({ name: "attachment_sent", actorId: ctx.user.id, route: "/trpc/chat.send" });
      }
      return result;
    } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось отправить" }); }
  }),
};
