import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type FriendState = {
  state: "self" | "none" | "outgoing_pending" | "incoming_pending" | "friends" | "blocked";
  requestId: string | null;
  blockedByMe: boolean;
};

function orderedPair(first: string, second: string) {
  return first < second ? [first, second] as const : [second, first] as const;
}

function friendError(message: string): Error {
  if (message.includes("FRIEND_SELF")) return new Error("Нельзя отправить запрос самому себе");
  if (message.includes("FRIEND_PAIR_BLOCKED")) return new Error("Общение с пользователем недоступно");
  if (message.includes("FRIEND_PRIVACY_DENIED")) return new Error("Пользователь не принимает запросы от вас");
  if (message.includes("FRIEND_REQUEST_FORBIDDEN")) return new Error("Запрос недоступен");
  if (message.includes("FRIEND_TARGET_MISSING")) return new Error("Пользователь не найден");
  return new Error("Не удалось изменить список друзей");
}

export async function getFriendStateRest(viewerId: string, targetId: string): Promise<FriendState> {
  if (viewerId === targetId) return { state: "self", requestId: null, blockedByMe: false };
  const admin = getAdminClient();
  const [low, high] = orderedPair(viewerId, targetId);
  const [blocks, friendship, requests] = await Promise.all([
    admin.from("user_blocks").select("blocker_id").or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`).limit(2),
    admin.from("friendships").select("user_low_id").eq("user_low_id", low).eq("user_high_id", high).maybeSingle(),
    admin.from("friend_requests").select("id, requester_id").eq("user_low_id", low).eq("user_high_id", high).eq("status", "pending").maybeSingle(),
  ]);
  const error = blocks.error ?? friendship.error ?? requests.error;
  if (error) throw new Error(error.message);
  if (blocks.data?.length) return {
    state: "blocked", requestId: null,
    blockedByMe: blocks.data.some((row) => row.blocker_id === viewerId),
  };
  if (friendship.data) return { state: "friends", requestId: null, blockedByMe: false };
  if (requests.data) return {
    state: requests.data.requester_id === viewerId ? "outgoing_pending" : "incoming_pending",
    requestId: String(requests.data.id), blockedByMe: false,
  };
  return { state: "none", requestId: null, blockedByMe: false };
}

export async function listFriendIdsRest(userId: string): Promise<string[]> {
  const { data, error } = await getAdminClient().from("friendships")
    .select("user_low_id, user_high_id")
    .or(`user_low_id.eq.${userId},user_high_id.eq.${userId}`).limit(1_000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.user_low_id === userId ? row.user_high_id : row.user_low_id));
}

export async function listIncomingFriendRequestsRest(userId: string) {
  const { data, error } = await getAdminClient().from("friend_requests")
    .select("id, requester_id, created_at")
    .eq("addressee_id", userId).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: String(row.id), userId: String(row.requester_id), createdAt: String(row.created_at) }));
}

export async function sendFriendRequestRest(actorId: string, targetId: string) {
  const { data, error } = await getAdminClient().rpc("send_friend_request", {
    p_requester_id: actorId, p_addressee_id: targetId,
  });
  if (error) throw friendError(error.message);
  return data as { state: FriendState["state"]; requestId?: string };
}

export async function respondFriendRequestRest(actorId: string, requestId: string, accept: boolean) {
  const { data, error } = await getAdminClient().rpc("respond_friend_request", {
    p_addressee_id: actorId, p_request_id: requestId, p_accept: accept,
  });
  if (error) throw friendError(error.message);
  return data as { state: string };
}

export async function cancelFriendRequestRest(actorId: string, requestId: string) {
  const { data, error } = await getAdminClient().rpc("cancel_friend_request", {
    p_requester_id: actorId, p_request_id: requestId,
  });
  if (error) throw friendError(error.message);
  return data as { state: string };
}

export async function removeFriendRest(actorId: string, targetId: string) {
  const { error } = await getAdminClient().rpc("remove_friend", {
    p_actor_id: actorId, p_target_id: targetId,
  });
  if (error) throw friendError(error.message);
  return { removed: true };
}
