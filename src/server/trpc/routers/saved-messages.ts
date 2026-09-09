import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { rateLimits } from "@/lib/ratelimit";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import {
  createSavedMessage,
  deleteSavedMessage,
  editSavedMessage,
  listSavedMessages,
} from "@/server/services/saved-messages.service";
import {
  assertServerFeatureAvailable,
  getServerFeatureAccess,
  ProductFeatureUnavailableError,
} from "@/server/services/product-feature-access.service";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  createSavedMessageInputSchema,
  editSavedMessageInputSchema,
  listSavedMessagesInputSchema,
} from "../schemas/saved-message";

function unavailable(message: string) {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function assertSavedMessagesAccess(userId: string) {
  try {
    assertServerFeatureAvailable("saved_messages", userId);
  } catch (error) {
    if (error instanceof ProductFeatureUnavailableError) {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    throw error;
  }
}

export const savedMessagesRouter = createTRPCRouter({
  availability: protectedProcedure.query(({ ctx }) => ({
    enabled: getServerFeatureAccess("saved_messages", ctx.user.id).enabled,
  })),
  list: protectedProcedure
    .input(listSavedMessagesInputSchema)
    .query(async ({ ctx, input }) => {
      assertSavedMessagesAccess(ctx.user.id);
      try {
        return await listSavedMessages({
          ownerId: ctx.user.id,
          cursor: input?.cursor,
          limit: input?.limit ?? 30,
          query: input?.query,
        });
      } catch {
        throw unavailable("Не удалось загрузить избранные сообщения");
      }
    }),
  create: protectedProcedure
    .input(createSavedMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSavedMessagesAccess(ctx.user.id);
      await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
      try {
        return await createSavedMessage({ ...input, ownerId: ctx.user.id });
      } catch {
        throw unavailable("Не удалось сохранить сообщение");
      }
    }),
  edit: protectedProcedure
    .input(editSavedMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSavedMessagesAccess(ctx.user.id);
      await assertRateLimit(rateLimits.sendMessage, ctx.user.id);
      try {
        return await editSavedMessage(input.messageId, ctx.user.id, input.text);
      } catch {
        throw unavailable("Не удалось изменить сохранённое сообщение");
      }
    }),
  delete: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertSavedMessagesAccess(ctx.user.id);
      try {
        return await deleteSavedMessage(input.messageId, ctx.user.id);
      } catch {
        throw unavailable("Не удалось удалить сохранённое сообщение");
      }
    }),
});
