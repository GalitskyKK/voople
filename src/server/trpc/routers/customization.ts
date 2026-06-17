import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  clearEquipSlot,
  equipShopItem,
  getEquippedCustomization,
  setAvatarPhoto,
  setCustomBanner,
  updateCustomization,
} from "@/server/services/customization.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const customizationRouter = createTRPCRouter({
  getEquipped: protectedProcedure.query(async ({ ctx }) => {
    try {
      return getEquippedCustomization(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "Не удалось загрузить кастомизацию",
      });
    }
  }),

  setAvatarPhoto: protectedProcedure
    .input(z.object({ mediaKey: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await setAvatarPhoto(ctx.user.id, input.mediaKey);
        return getEquippedCustomization(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить аватар",
        });
      }
    }),

  setCustomBanner: protectedProcedure
    .input(z.object({ mediaKey: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await setCustomBanner(ctx.user.id, input.mediaKey);
        return getEquippedCustomization(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить баннер",
        });
      }
    }),

  equip: protectedProcedure
    .input(z.object({ itemId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await equipShopItem(ctx.user.id, input.itemId);
        return getEquippedCustomization(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось экипировать",
        });
      }
    }),

  clearSlot: protectedProcedure
    .input(z.object({ slot: z.string().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await clearEquipSlot(ctx.user.id, input.slot);
        return getEquippedCustomization(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось снять предмет",
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        profileEffectId: z.string().nullable().optional(),
        avatarRingId: z.string().nullable().optional(),
        bannerId: z.string().nullable().optional(),
        avatarDecorationId: z.string().nullable().optional(),
        feedCardStyleId: z.string().nullable().optional(),
        animatedAvatarId: z.string().nullable().optional(),
        appThemeId: z.string().nullable().optional(),
        nicknameColor: z.string().nullable().optional(),
        nicknameGradient: z.boolean().nullable().optional(),
        themePrimary: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "Ожидается HEX-цвет вида #RRGGBB")
          .nullable()
          .optional(),
        themeAccent: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "Ожидается HEX-цвет вида #RRGGBB")
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateCustomization(ctx.user.id, input);
        return getEquippedCustomization(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось обновить кастомизацию",
        });
      }
    }),
});
