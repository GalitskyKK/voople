import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  addGroupMembers,
  acceptChatInvite,
  createChatInvite,
  createChatRoomMediaToken,
  createChatRoomScreenAudioToken,
  declineChatRoomCall,
  deleteGroup,
  createGroupChat,
  createSubchat,
  enterChatRoom,
  getSectionAccess,
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
  setGroupName,
  setSectionAccess,
  listChats,
  previewChatInvite,
  removeGroupMember,
  revokeChatInvite,
  setChatRoomAccess,
} from "@/server/services/chat.service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import { chatCommunityProcedures } from "./chat-community";
import { chatGroupRoleProcedures } from "./chat-group-roles";
import { chatModerationProcedures } from "./chat-moderation";
import {
  markRoomActivation,
  recordServerProductEvent,
} from "@/server/services/client-telemetry.service";
import { chatMessageProcedures } from "./chat-messages";
import { chatCoreReworkProcedures } from "./chat-core-rework";

export const chatRouter = createTRPCRouter({
  ...chatMessageProcedures,
  ...chatCoreReworkProcedures,
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
        const result = await acceptChatInvite(input.token, ctx.user.id);
        await recordServerProductEvent({ name: "group_joined", actorId: ctx.user.id, route: "/trpc/chat.acceptInvite", properties: { source: "invite" } });
        return result;
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
        const result = await enterChatRoom(input.chatId, ctx.user.id, input.micMuted);
        await recordServerProductEvent({ name: "room_joined", actorId: ctx.user.id, route: "/trpc/chat.enterRoom", properties: { count: result.participants.length } });
        if (result.participants.length > 1) await markRoomActivation(ctx.user.id);
        return result;
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
        const result = await createGroupChat(ctx.user.id, input.name, input.memberIds);
        await recordServerProductEvent({ name: "group_created", actorId: ctx.user.id, route: "/trpc/chat.createGroup", properties: { count: input.memberIds.length + 1 } });
        return result;
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
        const result = await createSubchat(
          input.parentChatId,
          ctx.user.id,
          input.name,
          input.icon,
          input.accessMode,
          input.memberIds,
        );
        await recordServerProductEvent({ name: "section_created", actorId: ctx.user.id, route: "/trpc/chat.createSubchat", properties: { kind: input.accessMode } });
        return result;
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
        visibility: z.enum(["private", "unlisted", "public"]),
        joinPolicy: z.enum(["open", "request", "invite_only"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupVisibility(input.chatId, ctx.user.id, input.visibility, input.joinPolicy);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить тип группы",
        });
      }
    }),
  setGroupName: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), name: z.string().trim().min(2).max(50) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupName(input.chatId, ctx.user.id, input.name);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось переименовать группу",
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
});
