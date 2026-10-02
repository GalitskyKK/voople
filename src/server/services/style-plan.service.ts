import "server-only";
import { personalPlanInstant } from "@/lib/personal-plans/timestamp";
import { insertStylePlanGrantRest, revokeStylePlanGrantRest, StylePlanDatabaseError } from "@/server/data/style-plan-grants-rest";
import { fulfillStylePlanSchema, revokeStylePlanSchema, StylePlanError, type StylePlanGrantFact } from "@/server/contracts/style-plan-contract";

function persistenceError(error: unknown): never {
  if (error instanceof StylePlanError) throw error;
  if (error instanceof StylePlanDatabaseError && ["23503", "23514", "22001", "22007", "22008"].includes(error.databaseCode)) {
    throw new StylePlanError("INTEGRITY_FAILURE", "Style grant violates database integrity", error);
  }
  throw new StylePlanError("DATABASE_FAILURE", "Unable to persist Style grant", error);
}

export async function fulfillStylePlanGrant(input: unknown): Promise<StylePlanGrantFact> {
  const parsed = fulfillStylePlanSchema.safeParse(input);
  if (!parsed.success) throw new StylePlanError("INVALID_REQUEST", "Invalid Style fulfillment request", parsed.error);
  const facts = parsed.data;
  try {
    const grant = await insertStylePlanGrantRest(facts);
    if (grant.sourceReference !== facts.sourceReference || grant.userId !== facts.userId || grant.planKind !== "style"
      || personalPlanInstant(grant.validFrom) !== personalPlanInstant(facts.validFrom)
      || personalPlanInstant(grant.validUntil) !== personalPlanInstant(facts.validUntil)) {
      throw new StylePlanError("SOURCE_CONFLICT", "Source reference already identifies different grant facts");
    }
    return { ...grant, planKind: "style" };
  } catch (error) { persistenceError(error); }
}

export async function revokeStylePlanGrant(input: unknown): Promise<StylePlanGrantFact> {
  const parsed = revokeStylePlanSchema.safeParse(input);
  if (!parsed.success) throw new StylePlanError("INVALID_REQUEST", "Invalid Style revocation request", parsed.error);
  try {
    const grant = await revokeStylePlanGrantRest(parsed.data.sourceReference);
    if (!grant) throw new StylePlanError("NOT_FOUND", "Style grant not found");
    if (grant.planKind !== "style") throw new StylePlanError("SOURCE_CONFLICT", "Source reference identifies a non-Style grant");
    if (grant.sourceReference !== parsed.data.sourceReference || grant.revokedAt === null) {
      throw new StylePlanError("DATABASE_FAILURE", "Invalid Style revocation result");
    }
    return { ...grant, planKind: "style" };
  } catch (error) { persistenceError(error); }
}
