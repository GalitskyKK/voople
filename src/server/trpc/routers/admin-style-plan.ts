import { TRPCError } from "@trpc/server";
import { fulfillStylePlanSchema, revokeStylePlanSchema, StylePlanError } from "@/server/contracts/style-plan-contract";
import { fulfillStylePlanGrant, revokeStylePlanGrant } from "@/server/services/style-plan.service";
import { adminProcedure } from "../init";

function toStylePlanTrpcError(error: unknown): TRPCError {
  const codes = {
    INVALID_REQUEST: "BAD_REQUEST", SOURCE_CONFLICT: "CONFLICT", NOT_FOUND: "NOT_FOUND",
    INTEGRITY_FAILURE: "BAD_REQUEST", DATABASE_FAILURE: "INTERNAL_SERVER_ERROR",
  } as const;
  return new TRPCError({
    code: error instanceof StylePlanError ? codes[error.code] : "INTERNAL_SERVER_ERROR",
    message: error instanceof StylePlanError ? error.message : "Unable to persist Style grant",
  });
}

export const adminStylePlanProcedures = {
  grantStylePlan: adminProcedure.input(fulfillStylePlanSchema).mutation(async ({ input }) => {
    try { return await fulfillStylePlanGrant(input); } catch (error) { throw toStylePlanTrpcError(error); }
  }),
  revokeStylePlan: adminProcedure.input(revokeStylePlanSchema).mutation(async ({ input }) => {
    try { return await revokeStylePlanGrant(input); } catch (error) { throw toStylePlanTrpcError(error); }
  }),
};
