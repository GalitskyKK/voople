import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";
import {
  createAdminShopItem,
  createCustomizationAssetUpload,
  deleteAdminShopItem,
  listAdminShopItems,
  updateAdminShopItem,
} from "@/server/services/admin-shop.service";
import { adminProcedure, createTRPCRouter } from "../init";

const shopKindSchema = z.enum([
  "effect",
  "ring",
  "banner",
  "nameplate",
  "badge",
  "reaction_pack",
  "decoration",
  "feed_card",
  "animated_avatar",
  "app_theme",
  "nickname_style",
  "profile_background",
]) satisfies z.ZodType<ShopItemKind>;

const equipSlotSchema = z.enum([
  "profile_effect_id",
  "avatar_ring_id",
  "banner",
  "avatar_decoration_id",
  "feed_card_style_id",
  "animated_avatar_id",
  "app_theme_id",
  "nickname_style",
  "profile_background_id",
]) satisfies z.ZodType<ShopEquipSlot>;

const shopItemInputSchema = z.object({
  id: z.string().min(2).max(100),
  seasonId: z.string().max(50).nullable().optional(),
  kind: shopKindSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  priceRub: z.number().int().min(0).max(500_000),
  priceCoins: z.number().int().min(0).max(1_000_000),
  isFree: z.boolean(),
  previewUrl: z.string().url().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  assetFolder: z.string().max(100).nullable().optional(),
  assetId: z.string().max(200).nullable().optional(),
  equipSlot: equipSlotSchema,
  equipValue: z.string().max(200).nullable().optional(),
});

function toTrpcError(e: unknown): TRPCError {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: e instanceof Error ? e.message : "Ошибка админки",
  });
}

export const adminRouter = createTRPCRouter({
  shopItems: adminProcedure.query(async () => {
    try {
      return await listAdminShopItems();
    } catch (e) {
      throw toTrpcError(e);
    }
  }),

  createShopItem: adminProcedure.input(shopItemInputSchema).mutation(async ({ input }) => {
    try {
      return await createAdminShopItem(input);
    } catch (e) {
      throw toTrpcError(e);
    }
  }),

  updateShopItem: adminProcedure
    .input(z.object({ itemId: z.string().min(1).max(100), data: shopItemInputSchema.omit({ id: true }) }))
    .mutation(async ({ input }) => {
      try {
        return await updateAdminShopItem(input.itemId, { ...input.data, id: input.itemId });
      } catch (e) {
        throw toTrpcError(e);
      }
    }),

  deleteShopItem: adminProcedure
    .input(z.object({ itemId: z.string().min(1).max(100) }))
    .mutation(async ({ input }) => {
      try {
        await deleteAdminShopItem(input.itemId);
        return { ok: true as const };
      } catch (e) {
        throw toTrpcError(e);
      }
    }),

  createAssetUpload: adminProcedure
    .input(
      z.object({
        kind: shopKindSchema,
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(3).max(100),
        sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024),
        assetFolder: z.string().max(100).optional(),
        assetId: z.string().max(200).optional(),
        targetFileName: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await createCustomizationAssetUpload(input);
      } catch (e) {
        throw toTrpcError(e);
      }
    }),
});
