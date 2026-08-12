import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { rateLimits } from "@/lib/ratelimit";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import {
  listGroupAudit,
  setGroupMemberRole,
  transferGroupOwnership,
} from "@/server/services/chat.service";

import { protectedProcedure } from "../init";

export const chatGroupRoleProcedures = {
  groupAudit: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupAudit(input.chatId, ctx.user.id, input.limit);
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error instanceof Error ? error.message : "Не удалось загрузить журнал действий",
        });
      }
    }),
  setGroupMemberRole: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      memberId: z.string().uuid(),
      role: z.enum(["admin", "member"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupMemberRole(input.chatId, ctx.user.id, input.memberId, input.role);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось изменить роль участника",
        });
      }
    }),
  transferGroupOwnership: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), targetUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await transferGroupOwnership(input.chatId, ctx.user.id, input.targetUserId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось передать владение группой",
        });
      }
    }),
};
