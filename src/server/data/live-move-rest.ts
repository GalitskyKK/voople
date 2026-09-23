import "server-only";

import { z } from "zod";

import { getAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  id: z.string().uuid(),
  sourceSessionId: z.string().uuid(),
  expiresAt: z.string(),
  selectedCount: z.number().int().min(1),
});

const responseSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["pending", "completed", "declined", "cancelled", "expired"]),
  acceptedCount: z.number().int().nonnegative().optional(),
  selectedCount: z.number().int().positive().optional(),
  targetRoomId: z.string().uuid().nullish(),
  targetSessionId: z.string().uuid().nullish(),
});

const statusSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  sourceSessionId: z.string().uuid(),
  mode: z.enum(["split", "voop"]),
  status: z.enum(["pending", "completed", "declined", "cancelled", "expired"]),
  acceptedCount: z.number().int().nonnegative(),
  selectedCount: z.number().int().positive(),
  targetRoomId: z.string().uuid().nullable(),
  targetSessionId: z.string().uuid().nullable(),
  expiresAt: z.string(),
});

export type LiveMoveStatus = z.infer<typeof statusSchema>;

async function call<T>(name: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const { data, error } = await getAdminClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return schema.parse(data);
}

export function createLiveMoveRest(input: {
  groupId: string;
  inviterId: string;
  inviteeIds: string[];
  mode: "split" | "voop";
  expectedSourceSessionId?: string;
}) {
  return call("request_live_move", {
    p_group_chat_id: input.groupId,
    p_inviter_id: input.inviterId,
    p_invitee_ids: input.inviteeIds,
    p_mode: input.mode,
    p_expected_source_session_id: input.expectedSourceSessionId ?? null,
  }, requestSchema);
}

export function respondLiveMoveRest(consentId: string, userId: string, accept: boolean) {
  return call("respond_live_move", {
    p_consent_id: consentId,
    p_user_id: userId,
    p_accept: accept,
  }, responseSchema);
}

export function cancelLiveMoveRest(requestId: string, inviterId: string) {
  return call("cancel_live_move", {
    p_request_id: requestId,
    p_inviter_id: inviterId,
  }, responseSchema);
}

export function getLiveMoveStatusRest(requestId: string, actorId: string) {
  return call("status_live_move", {
    p_request_id: requestId,
    p_actor_id: actorId,
  }, statusSchema);
}

export async function getLiveMoveConsentRest(consentId: string, actorId: string) {
  const { data, error } = await getAdminClient().from("live_move_consents")
    .select("id, request_id, user_id, status")
    .eq("id", consentId)
    .eq("user_id", actorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? {
    id: String(data.id),
    requestId: String(data.request_id),
    status: String(data.status),
  } : null;
}

export async function getLiveMoveConsentsForPreviewRest(consentIds: string[], actorId: string) {
  if (!consentIds.length) return [];
  const { data, error } = await getAdminClient().from("live_move_consents")
    .select("id, request_id, status")
    .in("id", consentIds)
    .eq("user_id", actorId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id), requestId: String(row.request_id), status: String(row.status),
  }));
}
