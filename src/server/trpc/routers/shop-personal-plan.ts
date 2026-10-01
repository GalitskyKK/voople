import { z } from "zod";
import { getPersonalPlanStatus } from "@/server/services/personal-plan.service";
import { protectedProcedure } from "../init";

export const shopPersonalPlanProcedures = {
  personalPlanStatus: protectedProcedure.input(z.void()).query(({ ctx }) => getPersonalPlanStatus(ctx.user.id)),
};
