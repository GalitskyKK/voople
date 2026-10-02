import "server-only";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  planTimestampSchema, sourceReferenceSchema,
  type FulfillStylePlanInput, type PersonalPlanGrantFact,
} from "@/server/contracts/style-plan-contract";
import { personalPlanInstant } from "@/lib/personal-plans/timestamp";

const columns = "id,user_id,plan_kind,source_reference,valid_from,valid_until,revoked_at,created_at";
const rowSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), plan_kind: z.enum(["style", "full"]),
  source_reference: sourceReferenceSchema, valid_from: planTimestampSchema, valid_until: planTimestampSchema,
  revoked_at: planTimestampSchema.nullable(), created_at: planTimestampSchema,
}).refine((row) => personalPlanInstant(row.valid_until) > personalPlanInstant(row.valid_from));

function grantFact(data: unknown): PersonalPlanGrantFact {
  const row = rowSchema.parse(data);
  return { id: row.id, userId: row.user_id, planKind: row.plan_kind, sourceReference: row.source_reference,
    validFrom: row.valid_from, validUntil: row.valid_until, revokedAt: row.revoked_at, createdAt: row.created_at };
}

export class StylePlanDatabaseError extends Error {
  readonly databaseCode: string;
  constructor(error: { code: string }) {
    super("Style grant persistence failed", { cause: error });
    this.databaseCode = error.code;
  }
}

export async function findStylePlanSourceRest(sourceReference: string): Promise<PersonalPlanGrantFact | null> {
  const { data, error } = await getAdminClient().from("personal_plan_grants").select(columns)
    .eq("source_reference", sourceReference).maybeSingle();
  if (error) throw new StylePlanDatabaseError(error);
  return data === null ? null : grantFact(data);
}

/** Only the source constraint's unique violation can become an idempotent replay. */
export async function insertStylePlanGrantRest(input: FulfillStylePlanInput): Promise<PersonalPlanGrantFact> {
  const { data, error } = await getAdminClient().from("personal_plan_grants").insert({
    user_id: input.userId, plan_kind: "style", source_reference: input.sourceReference,
    valid_from: input.validFrom, valid_until: input.validUntil,
  }).select(columns).single();
  if (error) {
    if (error.code === "23505" && error.message.includes('"personal_plan_grants_source_reference_key"')) {
      const existing = await findStylePlanSourceRest(input.sourceReference);
      if (existing) return existing;
    }
    throw new StylePlanDatabaseError(error);
  }
  return grantFact(data);
}

/** PostgreSQL parses the special timestamptz input 'now' at transaction time. */
export async function revokeStylePlanGrantRest(sourceReference: string): Promise<PersonalPlanGrantFact | null> {
  const { data, error } = await getAdminClient().from("personal_plan_grants").update({ revoked_at: "now" })
    .eq("source_reference", sourceReference).eq("plan_kind", "style").is("revoked_at", null)
    .select(columns).maybeSingle();
  if (error) throw new StylePlanDatabaseError(error);
  return data === null ? findStylePlanSourceRest(sourceReference) : grantFact(data);
}
