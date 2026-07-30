import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { createPresignedUpload } from "@/server/services/upload.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const uploadRouter = createTRPCRouter({
  createPresigned: protectedProcedure
    .input(
      z.object({
        purpose: z.enum(["post", "comment", "avatar", "banner", "track", "chat"]),
        contentType: z.string().min(3).max(100),
        chatMediaKind: z.enum(["voice", "circle"]).optional(),
        // Абсолютный потолок; точный лимит на назначение проверяет createPresignedUpload.
        sizeBytes: z.number().int().min(1).max(30 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.uploadTrack, ctx.user.id);
      try {
        return await createPresignedUpload({
          userId: ctx.user.id,
          purpose: input.purpose,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          chatMediaKind: input.chatMediaKind,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось подготовить загрузку",
        });
      }
    }),
});
