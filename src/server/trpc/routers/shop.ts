import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { applyPromoCode } from "@/server/services/promo.service";
import {
  claimAllFreeItems,
  claimShopItem,
  createRubPaymentIntent,
  getShopOverview,
  getSubscriptionStatus,
  purchaseShopItemWithCoins,
} from "@/server/services/shop.service";
import { createTRPCRouter, protectedProcedure } from "../init";

export const shopRouter = createTRPCRouter({
  subscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getSubscriptionStatus(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "Не удалось загрузить подписку",
      });
    }
  }),

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

  applyPromo: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      subscriptionPlan: z.enum(["monthly", "annual"]).default("monthly"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.applyPromo, ctx.user.id);
      try {
        const result = await applyPromoCode(ctx.user.id, input.code, input.subscriptionPlan);
        if (result.action === "redeemed") {
          const needsOverview =
            result.result.kind === "grant_item" || result.result.kind === "voops_bonus";
          return {
            ...result,
            overview: needsOverview ? await getShopOverview(ctx.user.id) : null,
          };
        }
        return { ...result, overview: null };
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось применить промокод",
        });
      }
    }),

  createPaymentIntent: protectedProcedure
    .input(
      z
        .object({
          kind: z.enum(["shop_item", "coin_pack", "donation", "subscription"]),
          amountRub: z.number().int().min(1).max(500_000).optional(),
          itemId: z.string().min(1).max(100).optional(),
          promoCode: z.string().min(1).max(50).optional(),
          subscriptionPlan: z.enum(["monthly", "annual"]).optional(),
        })
        .superRefine((value, ctx) => {
          if (value.kind === "shop_item" && !value.itemId) {
            ctx.addIssue({
              code: "custom",
              message: "Для покупки предмета нужен itemId",
            });
          }
          if (
            value.kind !== "shop_item" &&
            value.kind !== "subscription" &&
            value.amountRub == null
          ) {
            ctx.addIssue({
              code: "custom",
              message: "Укажите сумму в рублях",
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.createPayment, ctx.user.id);
      try {
        return await createRubPaymentIntent({
          userId: ctx.user.id,
          kind: input.kind,
          amountRub: input.amountRub,
          itemId: input.itemId,
          promoCode: input.promoCode,
          subscriptionPlan: input.subscriptionPlan,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось создать платёж",
        });
      }
    }),
});
