import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  claimAllFreeItems,
  claimShopItem,
  createRubPaymentIntent,
  getShopOverview,
  purchaseShopItemWithCoins,
} from "@/server/services/shop.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const shopRouter = createTRPCRouter({
  overview: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getShopOverview(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "Не удалось загрузить магазин",
      });
    }
  }),

  claimFree: protectedProcedure
    .input(z.object({ itemId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await claimShopItem(ctx.user.id, input.itemId);
        return getShopOverview(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось получить предмет",
        });
      }
    }),

  claimAllFree: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await claimAllFreeItems(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Не удалось получить предметы",
      });
    }
  }),

  purchaseWithCoins: protectedProcedure
    .input(z.object({ itemId: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await purchaseShopItemWithCoins(ctx.user.id, input.itemId);
        return getShopOverview(ctx.user.id);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось купить предмет",
        });
      }
    }),

  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        kind: z.enum(["shop_item", "coin_pack", "donation"]),
        amountRub: z.number().int().min(1).max(500_000),
        itemId: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createRubPaymentIntent({
          userId: ctx.user.id,
          kind: input.kind,
          amountRub: input.amountRub,
          itemId: input.itemId,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось создать платёж",
        });
      }
    }),
});
