import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  getGroupCommunity,
  joinPublicGroup,
  listPublicGroups,
  setGroupBoost,
  updateGroupCustomization,
} from "@/server/services/chat.service";

import { protectedProcedure } from "../init";

export const chatCommunityProcedures = {
  publicGroups: protectedProcedure
    .input(z.object({ q: z.string().trim().min(2).max(50) }))
    .query(async ({ ctx, input }) => {
      try {
        return await listPublicGroups(ctx.user.id, input.q);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось найти открытые группы" });
      }
    }),
  joinPublicGroup: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.joinPublicGroup, ctx.user.id);
      try {
        return await joinPublicGroup(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось вступить в группу" });
      }
    }),
  groupCommunity: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getGroupCommunity(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось загрузить оформление группы" });
      }
    }),
  updateGroupCustomization: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      description: z.string().trim().max(160).nullable(),
      icon: z.string().trim().max(16).nullable(),
      publicSlug: z.string().trim().min(5).max(32).regex(/^[a-z0-9_]+$/).nullable(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
      avatarKey: z.string().trim().max(512).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await updateGroupCustomization(input.chatId, ctx.user.id, input);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось сохранить оформление группы" });
      }
    }),
  setGroupBoost: protectedProcedure
    .input(z.object({ chatId: z.string().uuid(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupBoost(input.chatId, ctx.user.id, input.enabled);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось изменить буст" });
      }
    }),
};
