import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import {
  addGroupMembers,
  acceptChatInvite,
  createChatInvite,
  createChatRoomMediaToken,
  createChatRoomScreenAudioToken,
  declineChatRoomCall,
  deleteGroup,
  deleteMessage,
  editMessage,
  createGroupChat,
  createSubchat,
  enterChatRoom,
  getSectionAccess,
  getDirectChatByUsername,
  getMessageNotification,
  getChatRoom,
  heartbeatChatRoom,
  leaveChatRoom,
  leaveGroup,
  listChatContacts,
  listIncomingCalls,
  listGroupContacts,
  listGroupMembers,
  setGroupTopics,
  setGroupVisibility,
  setSectionAccess,
  listChats,
  listMessages,
  markMessagesRead,
  previewChatInvite,
  removeGroupMember,
  revokeChatInvite,
  sendMessage,
  setChatRoomAccess,
  toggleMessageReaction,
} from "@/server/services/chat.service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import { chatCommunityProcedures } from "./chat-community";
import { chatGroupRoleProcedures } from "./chat-group-roles";
import { chatModerationProcedures } from "./chat-moderation";
import { sendChatMessageInputSchema } from "../schemas/chat-message";

export const chatRouter = createTRPCRouter({
  ...chatModerationProcedures,
  ...chatCommunityProcedures,
  ...chatGroupRoleProcedures,
  invitePreview: publicProcedure
    .input(z.object({ token: z.string().min(5).max(100) }))
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
    .input(z.object({ token: z.string().min(5).max(100) }))
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

  roomScreenAudioToken: protectedProcedure.input(z.object({ chatId: z.string().uuid(), screenSessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        return await createChatRoomScreenAudioToken(input.chatId, ctx.user.id, input.screenSessionId);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось подключить звук демонстрации" });
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

  messageNotification: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getMessageNotification(input.messageId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            error instanceof Error
              ? error.message
              : "Уведомление о сообщении недоступно",
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
    .input(z.object({ name: z.string().trim().min(2).max(50), memberIds: z.array(z.string().uuid()).max(19) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createGroupChat, ctx.user.id);
      try {
        return await createGroupChat(ctx.user.id, input.name, input.memberIds);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось создать группу" });
      }
    }),
  groupMembers: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupMembers(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить участников",
        });
      }
    }),
  groupContacts: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid().optional(),
        q: z.string().trim().max(50).default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupContacts(ctx.user.id, input.q, input.chatId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить контакты",
        });
      }
    }),
  contacts: protectedProcedure
    .input(z.object({ q: z.string().trim().max(50).default("") }))
    .query(async ({ ctx, input }) => {
      try {
        return await listChatContacts(ctx.user.id, input.q);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить контакты",
        });
      }
    }),
  addGroupMembers: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        memberIds: z.array(z.string().uuid()).min(1).max(19),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await addGroupMembers(input.chatId, ctx.user.id, input.memberIds);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось добавить участников",
        });
      }
    }),
  removeGroupMember: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await removeGroupMember(input.chatId, ctx.user.id, input.memberId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось исключить участника",
        });
      }
    }),
  leaveGroup: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await leaveGroup(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось выйти из группы",
        });
      }
    }),
  deleteGroup: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await deleteGroup(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось удалить группу",
        });
      }
    }),
  createSubchat: protectedProcedure
    .input(
      z.object({
        parentChatId: z.string().uuid(),
        name: z.string().trim().min(2).max(50),
        icon: z.string().trim().max(16).nullable().default(null),
        accessMode: z.enum(["inherit", "restricted"]).default("inherit"),
        memberIds: z.array(z.string().uuid()).max(20).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createGroupChat, ctx.user.id);
      try {
        return await createSubchat(
          input.parentChatId,
          ctx.user.id,
          input.name,
          input.icon,
          input.accessMode,
          input.memberIds,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось создать раздел",
        });
      }
    }),
  setGroupTopics: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        enabled: z.boolean(),
        layout: z.enum(["tabs", "list"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupTopics(
          input.chatId,
          ctx.user.id,
          input.enabled,
          input.layout,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось сохранить настройки разделов",
        });
      }
    }),
  setGroupVisibility: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        visibility: z.enum(["private", "public"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupVisibility(input.chatId, ctx.user.id, input.visibility);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить тип группы",
        });
      }
    }),
  setSectionAccess: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        accessMode: z.enum(["inherit", "restricted"]),
        memberIds: z.array(z.string().uuid()).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setSectionAccess(
          input.chatId,
          ctx.user.id,
          input.accessMode,
          input.memberIds,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить доступ раздела",
        });
      }
    }),
  sectionAccess: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getSectionAccess(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить настройки раздела",
        });
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

  editMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        text: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.openDirectChat, ctx.user.id);
      await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
      try {
        return await editMessage(input.messageId, ctx.user.id, input.text);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить сообщение",
        });
      }
    }),

  toggleReaction: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid(),
      emoji: z.enum(CHAT_REACTION_EMOJIS).optional(),
      emojiId: z.string().uuid().optional(),
    }).refine((value) => Boolean(value.emoji) !== Boolean(value.emojiId), { message: "Выберите одну реакцию" }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.like, ctx.user.id);
      try {
        return await toggleMessageReaction(input.messageId, ctx.user.id, { emoji: input.emoji, emojiId: input.emojiId });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось изменить реакцию",
        });
      }
    }),

  send: protectedProcedure.input(sendChatMessageInputSchema).mutation(async ({ ctx, input }) => {
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
