import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { ChatAccessDeniedError, getChatMembershipRest } from "@/server/data/chat-access-rest";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";
import { assertUsersCanInteractRest } from "@/server/data/user-blocks-rest";
import {
  cancelLiveMoveRest,
  createLiveMoveRest,
  getLiveMoveConsentRest,
  getLiveMoveStatusRest,
  listMyLiveMoveIdsRest,
  respondLiveMoveRest,
} from "@/server/data/live-move-rest";
import { getGroupNow } from "@/server/services/group-now.service";

export async function requestLiveMove(input: {
  groupId: string;
  inviterId: string;
  inviteeIds: string[];
  mode: "split" | "voop";
  expectedSourceSessionId?: string;
}) {
  const ids = [...new Set(input.inviteeIds)];
  if (!ids.length || ids.length > 8 || ids.length !== input.inviteeIds.length
    || ids.includes(input.inviterId) || input.mode === "voop" && ids.length !== 1) {
    throw new Error("Выберите от одного до восьми участников текущего разговора");
  }
  const membership = await getChatMembershipRest(input.groupId, input.inviterId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new ChatAccessDeniedError("Сплит доступен только в основной группе");
  }
  await Promise.all(ids.map(async (id) => {
    const target = await getChatMembershipRest(input.groupId, id);
    if (target.type !== "group" || target.parentChatId) {
      throw new ChatAccessDeniedError("Участник больше не состоит в группе");
    }
    await assertUsersCanInteractRest(input.inviterId, id);
  }));
  const allowed = await filterUserIdsByPrivacyFieldRest(ids, input.inviterId, "inviteScope");
  if (allowed.length !== ids.length) throw new Error("Один из участников запретил приглашения");
  return createLiveMoveRest(input);
}

export async function respondLiveMove(consentId: string, userId: string, accept: boolean) {
  return respondLiveMoveRest(consentId, userId, accept);
}

export async function cancelLiveMove(requestId: string, inviterId: string) {
  return cancelLiveMoveRest(requestId, inviterId);
}

export async function liveMoveStatus(requestId: string, actorId: string) {
  const status = await getLiveMoveStatusRest(requestId, actorId);
  if (status.status !== "completed" || !status.targetRoomId || !status.targetSessionId) {
    return { ...status, room: null, join: null };
  }
  const [now, sessionResult] = await Promise.all([
    getGroupNow(status.groupId, actorId),
    getAdminClient().from("live_sessions")
      .select("provider_session_id")
      .eq("id", status.targetSessionId)
      .maybeSingle(),
  ]);
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  const room = now.rooms.find((candidate) =>
    candidate.id === status.targetRoomId
    && candidate.liveSessionId === status.targetSessionId,
  ) ?? null;
  if (!room || !sessionResult.data) return { ...status, room: null, join: null };
  return {
    ...status,
    room,
    join: {
      roomId: status.targetRoomId,
      sessionId: status.targetSessionId,
      providerSessionId: String(sessionResult.data.provider_session_id),
      previousSessionId: status.sourceSessionId,
      switched: true,
    },
  };
}

export async function liveMoveStatusForConsent(consentId: string, userId: string) {
  const consent = await getLiveMoveConsentRest(consentId, userId);
  if (!consent) throw new Error("Запрос больше недоступен");
  return liveMoveStatus(consent.requestId, userId);
}

export async function listMyLiveMoves(actorId: string) {
  const ids = await listMyLiveMoveIdsRest(actorId);
  return Promise.all(ids.map((id) => liveMoveStatus(id, actorId)));
}
