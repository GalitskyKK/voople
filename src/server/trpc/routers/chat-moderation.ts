import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { REPORT_REASON_CODES } from "@/lib/moderation/report";
import { rateLimits } from "@/lib/ratelimit";
import { assertRateLimit } from "@/lib/ratelimit-guard";
import { createModerationReportRest } from "@/server/data/moderation-reports-rest";

import { protectedProcedure } from "../init";

export const chatModerationProcedures = {
  reportMessage: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid(),
      reasonCode: z.enum(REPORT_REASON_CODES),
      details: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.reportContent, `report:${ctx.user.id}`);
      try {
        return await createModerationReportRest({
          reporterUserId: ctx.user.id,
          subjectType: "message",
          subjectId: input.messageId,
          reasonCode: input.reasonCode,
          details: input.details,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Не удалось отправить жалобу",
        });
      }
    }),
};
