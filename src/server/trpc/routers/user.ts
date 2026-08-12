import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { searchAll, searchUsers } from "@/server/services/search.service";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/constants/legal";
import { rateLimits } from "@/lib/ratelimit";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import {
  cancelAccountDeletionRest,
  fetchCurrentLegalConsentRest,
  recordLegalConsentRest,
} from "@/server/data/account-lifecycle-rest";
import {
  AccountDeletionError,
  getAccountDeletionStatus,
  requestAccountDeletionVerification,
  verifyAccountDeletionCode,
} from "@/server/services/account-deletion.service";
import {
  fetchCurrentUserSummary,
  setUserPresenceVisibilityRest,
  touchUserPresenceRest,
} from "@/server/data/users-rest";

import { createTRPCRouter, optionalAuthProcedure, protectedProcedure, publicProcedure } from "../init";

const deletionErrorMessages = {
  EMAIL_NOT_CONFIRMED: "Сначала подтвердите адрес электронной почты аккаунта",
  EMAIL_DELIVERY_FAILED: "Не удалось отправить код. Проверьте почту и попробуйте ещё раз",
  INVALID_CODE: "Неверный код подтверждения",
  EXPIRED_CODE: "Код истёк. Запросите новый",
  TOO_MANY_ATTEMPTS: "Слишком много неверных попыток. Запросите новый код",
  NOT_PENDING: "Активного подтверждения нет. Запросите новый код",
  CONFIGURATION_ERROR: "Подтверждение удаления временно недоступно",
} as const;

function accountDeletionError(error: unknown): never {
  if (error instanceof AccountDeletionError) {
    throw new TRPCError({
      code: error.reason === "CONFIGURATION_ERROR" ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
      message: deletionErrorMessages[error.reason],
    });
  }
  throw error;
}

export const userRouter = createTRPCRouter({
  viewer: optionalAuthProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return fetchCurrentUserSummary(ctx.user.id);
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await fetchCurrentUserSummary(ctx.user.id);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Профиль не создан — перезайдите в аккаунт",
      });
    }
    return user;
  }),

  legalConsentStatus: protectedProcedure.query(async ({ ctx }) => ({
    privacyVersion: PRIVACY_VERSION,
    termsVersion: TERMS_VERSION,
    ...(await fetchCurrentLegalConsentRest(
      ctx.user.id,
      PRIVACY_VERSION,
      TERMS_VERSION,
    )),
  })),

  acceptLegalDocuments: protectedProcedure
    .input(z.object({ source: z.enum(["web_reconsent", "desktop_reconsent"]) }))
    .mutation(async ({ ctx, input }) => ({
      privacyVersion: PRIVACY_VERSION,
      termsVersion: TERMS_VERSION,
      ...(await recordLegalConsentRest({
        userId: ctx.user.id,
        privacyVersion: PRIVACY_VERSION,
        termsVersion: TERMS_VERSION,
        source: input.source,
      })),
    })),

  accountDeletionStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getAccountDeletionStatus(ctx.user.id);
    } catch (error) {
      return accountDeletionError(error);
    }
  }),

  requestAccountDeletion: protectedProcedure
    .input(z.object({ username: z.string().min(3).max(30) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.accountDeletion, `delete:${ctx.user.id}`);
      const user = await fetchCurrentUserSummary(ctx.user.id);
      if (!user || user.username.toLocaleLowerCase("ru") !== input.username.trim().toLocaleLowerCase("ru")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Введите точный username аккаунта",
        });
      }
      try {
        return await requestAccountDeletionVerification(ctx.user.id);
      } catch (error) {
        return accountDeletionError(error);
      }
    }),

  resendAccountDeletionVerification: protectedProcedure.mutation(async ({ ctx }) => {
    await assertRateLimit(rateLimits.accountDeletion, `delete:${ctx.user.id}`);
    try {
      return await requestAccountDeletionVerification(ctx.user.id);
    } catch (error) {
      return accountDeletionError(error);
    }
  }),

  verifyAccountDeletion: protectedProcedure
    .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.accountDeletionVerification, `delete-code:${ctx.user.id}`);
      try {
        return await verifyAccountDeletionCode(ctx.user.id, input.code);
      } catch (error) {
        return accountDeletionError(error);
      }
    }),

  cancelAccountDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    await assertRateLimit(rateLimits.accountDeletion, `delete:${ctx.user.id}`);
    return cancelAccountDeletionRest(ctx.user.id);
  }),

  touchPresence: protectedProcedure.mutation(({ ctx }) =>
    touchUserPresenceRest(ctx.user.id)
  ),

  setPresenceVisibility: protectedProcedure
    .input(z.object({ visible: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setUserPresenceVisibilityRest(ctx.user.id, input.visible)
    ),

  checkUsername: optionalAuthProcedure
    .input(z.object({ username: z.string().min(3).max(30) }))
    .query(async ({ input, ctx }) => {
      const { isUsernameAvailable } = await import("@/server/services/user-sync.service");
      const available = await isUsernameAvailable(input.username, ctx.user?.id);
      return { available };
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      try {
        return await searchUsers(input.q);
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Ошибка поиска",
        });
      }
    }),

  searchAll: publicProcedure
    .input(z.object({ q: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      try {
        return await searchAll(input.q);
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Ошибка поиска",
        });
      }
    }),
});
