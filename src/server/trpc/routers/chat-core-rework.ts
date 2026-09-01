import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  archiveGroupRoom,
  createAndJoinGroupRoom,
  createGroupRoomMediaToken,
  createGroupRoom,
  getGroupNow,
  heartbeatGroupRoom,
  joinGroupRoom,
  leaveGroupRoom,
  setGroupRoomKind,
} from "@/server/services/chat.service";
import { recordServerProductEvent } from "@/server/services/client-telemetry.service";
import {
  assertServerFeatureAvailable,
  ProductFeatureUnavailableError,
} from "@/server/services/product-feature-access.service";

import { protectedProcedure } from "../init";

const roomKindSchema = z.enum(["temporary", "pinned"]);

function assertMultiRoomAccess(userId: string) {
  try {
    assertServerFeatureAvailable("multi_room_groups", userId);
  } catch (error) {
    if (error instanceof ProductFeatureUnavailableError) {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    throw error;
  }
}

function toRoomError(error: unknown, fallback: string): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof ProductFeatureUnavailableError) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (
    error instanceof Error
    && error.message === "Сначала подтвердите завершение текущего разговора"
  ) {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
  }
  return new TRPCError({
    code: "BAD_REQUEST",
    message: error instanceof Error ? error.message : fallback,
  });
}

export const chatCoreReworkProcedures = {
  coreGroupNow: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        assertMultiRoomAccess(ctx.user.id);
        return await getGroupNow(input.groupId, ctx.user.id);
      } catch (error) {
        throw toRoomError(error, "Не удалось загрузить комнаты группы");
      }
    }),

  coreCreateRoom: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid(),
      kind: roomKindSchema,
      name: z.string().trim().min(1).max(80),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        const room = await createGroupRoom({ ...input, userId: ctx.user.id });
        await recordServerProductEvent({
          name: "room_created",
          actorId: ctx.user.id,
          route: "/trpc/chat.coreCreateRoom",
          properties: { kind: room.kind },
        });
        return room;
      } catch (error) {
        throw toRoomError(error, "Не удалось создать комнату");
      }
    }),

  coreCreateAndJoinRoom: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid(),
      kind: roomKindSchema,
      name: z.string().trim().min(1).max(80),
      requestId: z.string().uuid(),
      micMuted: z.boolean().default(true),
      confirmedCrossContext: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        const result = await createAndJoinGroupRoom({
          groupId: input.groupId,
          userId: ctx.user.id,
          kind: input.kind,
          name: input.name,
          requestId: input.requestId,
          micMuted: input.micMuted,
          allowCrossContext: input.confirmedCrossContext,
        });
        await recordServerProductEvent({
          name: "room_created",
          actorId: ctx.user.id,
          route: "/trpc/chat.coreCreateAndJoinRoom",
          properties: { kind: result.room.kind, joined: true },
        });
        return result;
      } catch (error) {
        throw toRoomError(error, "Не удалось создать комнату");
      }
    }),

  coreSetRoomKind: protectedProcedure
    .input(z.object({ roomId: z.string().uuid(), kind: roomKindSchema }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupRoomKind({ ...input, userId: ctx.user.id });
      } catch (error) {
        throw toRoomError(error, "Не удалось изменить тип комнаты");
      }
    }),

  coreArchiveRoom: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await archiveGroupRoom(input.roomId, ctx.user.id);
      } catch (error) {
        throw toRoomError(error, "Не удалось удалить комнату");
      }
    }),

  coreJoinRoom: protectedProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      micMuted: z.boolean().default(true),
      confirmedCrossContext: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        const result = await joinGroupRoom({
          roomId: input.roomId,
          userId: ctx.user.id,
          micMuted: input.micMuted,
          allowCrossContext: input.confirmedCrossContext,
        });
        await recordServerProductEvent({
          name: "room_joined",
          actorId: ctx.user.id,
          route: "/trpc/chat.coreJoinRoom",
          properties: { switched: result.switched },
        });
        return result;
      } catch (error) {
        throw toRoomError(error, "Не удалось войти в комнату");
      }
    }),

  coreRoomMediaToken: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try {
        return await createGroupRoomMediaToken(input.sessionId, ctx.user.id);
      } catch (error) {
        throw toRoomError(error, "Не удалось подключить голос");
      }
    }),

  coreLeaveRoom: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      try {
        const result = await leaveGroupRoom({
          userId: ctx.user.id,
          sessionId: input.sessionId,
        });
        if (result.left) {
          await recordServerProductEvent({
            name: "room_left",
            actorId: ctx.user.id,
            route: "/trpc/chat.coreLeaveRoom",
            properties: { status: result.sessionStatus ?? "unknown" },
          });
        }
        return result;
      } catch (error) {
        throw toRoomError(error, "Не удалось выйти из комнаты");
      }
    }),

  coreHeartbeatRoom: protectedProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      micMuted: z.boolean(),
      cameraEnabled: z.boolean(),
      screenSharing: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertMultiRoomAccess(ctx.user.id);
      try {
        return await heartbeatGroupRoom({ ...input, userId: ctx.user.id });
      } catch (error) {
        throw toRoomError(error, "Связь с комнатой потеряна");
      }
    }),
};
