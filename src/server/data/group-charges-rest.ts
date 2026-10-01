import "server-only";

import { z } from "zod";

import { getAdminClient } from "@/lib/supabase/admin";
import { isGroupChargeActive } from "@/lib/groups/group-grade";
import type { GroupCharge } from "@/types/group-grade";

const chargeRowSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  root_group_id: z.string().uuid().nullable(),
  origin: z.enum(["included_voople_plus", "standalone"]),
  valid_from: z.string().datetime({ offset: true }),
  valid_until: z.string().datetime({ offset: true }),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
}).refine((row) => Date.parse(row.valid_from) < Date.parse(row.valid_until), {
  message: "Invalid charge validity window",
});

/** One database snapshot, without PostgREST's returned-row pagination limit. */
export async function loadActiveGroupChargesRest(rootGroupId: string, evaluatedAt: Date): Promise<GroupCharge[]> {
  z.string().uuid().parse(rootGroupId);
  const timestamp = evaluatedAt.toISOString();
  const { data, error } = await getAdminClient().rpc("load_active_group_charges", {
    p_root_group_id: rootGroupId,
    p_evaluated_at: timestamp,
  });
  if (error) throw new Error("Unable to load Group charges", { cause: error });
  const charges = z.array(chargeRowSchema).parse(data).map((row): GroupCharge => ({
    id: row.id,
    ownerUserId: row.owner_user_id,
    rootGroupId: row.root_group_id,
    origin: row.origin,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    revokedAt: row.revoked_at,
  }));
  if (charges.some((charge) => !isGroupChargeActive(charge, rootGroupId, evaluatedAt))
    || new Set(charges.map((charge) => charge.id)).size !== charges.length) {
    throw new Error("Invalid active Group charge snapshot");
  }
  return charges;
}
