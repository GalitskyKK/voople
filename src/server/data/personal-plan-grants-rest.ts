import "server-only";

import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { isPersonalPlanGrantActive } from "@/lib/personal-plans/personal-plan";
import type { PersonalPlanGrant } from "@/types/personal-plan";

const grantRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_kind: z.enum(["style", "full"]),
  valid_from: z.string().datetime({ offset: true }),
  valid_until: z.string().datetime({ offset: true }),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
}).refine((row) => Date.parse(row.valid_from) < Date.parse(row.valid_until), {
  message: "Invalid personal-plan validity window",
});

/** One SQL snapshot and one evaluation timestamp, without REST row truncation. */
export async function loadActivePersonalPlanGrantsRest(userId: string, evaluatedAt: Date): Promise<PersonalPlanGrant[]> {
  z.string().uuid().parse(userId);
  const timestamp = evaluatedAt.toISOString();
  const evaluation = new Date(timestamp);
  const { data, error } = await getAdminClient().rpc("load_active_personal_plan_grants", {
    p_user_id: userId,
    p_evaluated_at: timestamp,
  });
  if (error) throw new Error("Unable to load personal-plan grants", { cause: error });
  const grants = z.array(grantRowSchema).parse(data).map((row): PersonalPlanGrant => ({
    id: row.id, userId: row.user_id, planKind: row.plan_kind,
    validFrom: row.valid_from, validUntil: row.valid_until, revokedAt: row.revoked_at,
  }));
  if (grants.some((grant) => grant.userId !== userId || !isPersonalPlanGrantActive(grant, evaluation))
    || new Set(grants.map((grant) => grant.id)).size !== grants.length) {
    throw new Error("Invalid active personal-plan grant snapshot");
  }
  return grants;
}
