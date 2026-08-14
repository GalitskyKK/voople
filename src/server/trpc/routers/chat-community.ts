import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import {
  getGroupCommunity,
  createGroupEmoji,
  createGroupSound,
  deleteGroupEmoji,
  deleteGroupSound,
  joinPublicGroup,
  listGroupEmojis,
  listGroupSounds,
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
      tag: z.string().trim().toUpperCase().min(2).max(5).regex(/^[\p{L}\p{N}]+$/u).nullable(),
      vanityInviteSlug: z.string().trim().toLowerCase().min(5).max(32).regex(/^[a-z0-9_]+$/).nullable(),
      roleColors: z.object({
        owner: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
        admin: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
        member: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
      }),
      avatarKey: z.string().trim().max(512).nullable().optional(),
      bannerKey: z.string().trim().max(512).nullable().optional(),
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
    .input(z.object({
      chatId: z.string().uuid(),
      enabled: z.boolean(),
      slot: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      idempotencyKey: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await setGroupBoost(input.chatId, ctx.user.id, input.enabled, input.slot, input.idempotencyKey);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось изменить буст" });
      }
    }),
  groupEmojis: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupEmojis(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось загрузить эмодзи" });
      }
    }),
  createGroupEmoji: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,32}$/),
      uploadKey: z.string().min(10).max(512),
      rightsConfirmed: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await createGroupEmoji({ ...input, userId: ctx.user.id });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось добавить эмодзи" });
      }
    }),
  deleteGroupEmoji: protectedProcedure
    .input(z.object({ emojiId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await deleteGroupEmoji(input.emojiId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось удалить эмодзи" });
      }
    }),
  groupSounds: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupSounds(input.chatId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось загрузить звуки" });
      }
    }),
  createGroupSound: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      name: z.string().trim().min(2).max(32),
      uploadKey: z.string().min(10).max(512),
      rightsConfirmed: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await createGroupSound({ ...input, userId: ctx.user.id });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось добавить звук" });
      }
    }),
  deleteGroupSound: protectedProcedure
    .input(z.object({ soundId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        return await deleteGroupSound(input.soundId, ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Не удалось удалить звук" });
      }
    }),
};
