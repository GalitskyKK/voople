import "server-only";

import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { NicknameFontAccess } from "@/types/personal-style-access";

/** One bounded aggregate per 200 subjects, regardless of overlapping grant count. */
export async function loadNicknameFontAccessRest(userIds: string[], evaluatedAt = new Date()) {
  const ids = [...new Set(z.array(z.string().uuid()).parse(userIds))];
  const timestamp = new Date(evaluatedAt.toISOString());
  const result = new Map<string, NicknameFontAccess>();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    const { data, error } = await getAdminClient().rpc("load_active_style_subjects", {
      p_user_ids: batch, p_evaluated_at: timestamp.toISOString(),
    });
    if (error) throw new Error("Unable to load nickname font access", { cause: error });
    const covered = z.array(z.string().uuid()).parse(data);
    if (covered.some(id => !batch.includes(id)) || new Set(covered).size !== covered.length) {
      throw new Error("Invalid Style coverage subjects");
    }
    const active = new Set(covered);
    for (const id of batch) result.set(id, { evaluatedAt: timestamp, activeStyleCoverage: active.has(id) });
  }
  return result;
}
