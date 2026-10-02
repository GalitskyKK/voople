import "server-only";
import { z } from "zod";
import { personalPlanInstant } from "@/lib/personal-plans/timestamp";
import type { PersonalPlanGrant } from "@/types/personal-plan";

export const sourceReferenceSchema = z.string().min(1).max(200)
  .refine((value) => value === value.trim(), "Source reference must already be trimmed");
export const planTimestampSchema = z.string().datetime({ offset: true })
  .refine((value) => {
    try { personalPlanInstant(value); return true; } catch { return false; }
  }, "Expected a finite ISO timestamp with at most six fractional digits");
export const fulfillStylePlanSchema = z.strictObject({
  userId: z.string().uuid().transform((value) => value.toLowerCase()),
  sourceReference: sourceReferenceSchema,
  validFrom: planTimestampSchema,
  validUntil: planTimestampSchema,
}).refine((value) => {
  try { return personalPlanInstant(value.validUntil) > personalPlanInstant(value.validFrom); } catch { return false; }
}, {
  message: "validUntil must be after validFrom", path: ["validUntil"],
});
export const revokeStylePlanSchema = z.strictObject({ sourceReference: sourceReferenceSchema });
export type FulfillStylePlanInput = z.infer<typeof fulfillStylePlanSchema>;
export interface PersonalPlanGrantFact extends PersonalPlanGrant {
  sourceReference: string;
  createdAt: string;
}
export type StylePlanGrantFact = Omit<PersonalPlanGrantFact, "planKind"> & { planKind: "style" };
export type StylePlanErrorCode = "INVALID_REQUEST" | "SOURCE_CONFLICT" | "INTEGRITY_FAILURE" | "NOT_FOUND" | "DATABASE_FAILURE";
export class StylePlanError extends Error {
  readonly code: StylePlanErrorCode;
  constructor(code: StylePlanErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "StylePlanError";
    this.code = code;
  }
}
