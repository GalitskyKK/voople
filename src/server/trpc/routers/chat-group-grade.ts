import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ChatAccessDeniedError } from "@/server/data/chat-access-rest";
import { getGroupGrade } from "@/server/services/group-grade.service";
import { protectedProcedure } from "../init";

export const chatGroupGradeProcedures = {
  groupGrade: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }).strict())
    .query(async ({ ctx, input }) => {
      try {
        return await getGroupGrade(input.chatId, ctx.user.id);
      } catch (error) {
        if (error instanceof ChatAccessDeniedError) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Group is unavailable" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to resolve Group Grade", cause: error });
      }
    }),
};
