import { getAdminClient } from "@/lib/supabase/admin";
import { messageMentionsUsername } from "@/lib/social/home-attention";
import { canViewPrivateFieldRest, getUserPrivacySettingsRest } from "@/server/data/privacy-rest";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import type { ChatRoomParticipantView } from "@/types/chat";

export type HomePersonCandidate = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarDecorationUrl: string | null;
  avatarRingId: string | null;
};

const ACTIVE_PARTICIPANT_WINDOW_MS = 3 * 60_000;

export async function getActiveRoomPresenceRest(chatIds: string[], viewerId: string) {
  const result = new Map<string, ChatRoomParticipantView[]>();
  if (!chatIds.length) return result;
  const activeAfter = new Date(Date.now() - ACTIVE_PARTICIPANT_WINDOW_MS).toISOString();
  const { data, error } = await getAdminClient()
    .from("chat_room_participants")
    .select("chat_id, user_id, mic_muted, joined_at, users!inner(id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id))")
    .in("chat_id", chatIds)
    .gte("last_seen_at", activeAfter)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!user) continue;
    const relation = user.profile_customization as CustomizationRow | CustomizationRow[] | null;
    const customization = toProfileCustomizationView(
      Array.isArray(relation) ? relation[0] : relation,
    );
    const chatId = String(row.chat_id);
    const participants = result.get(chatId) ?? [];
    participants.push({
      id: String(user.id),
      username: String(user.username),
      displayName: String(user.display_name),
      avatarUrl: customization.assets.animatedAvatarUrl ?? null,
      avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
      avatarRingId: customization.avatarRingId ?? null,
      micMuted: Boolean(row.mic_muted),
      isMe: row.user_id === viewerId,
    });
    result.set(chatId, participants);
  }
  return result;
}

export async function listSharedGroupPeopleRest(viewerId: string) {
  const admin = getAdminClient();
  const memberships = await admin
    .from("chat_members")
    .select("chat_id, chats!inner(type)")
    .eq("user_id", viewerId)
    .eq("chats.type", "group")
    .limit(200);
  if (memberships.error) throw new Error(memberships.error.message);
  const groupIds = [...new Set((memberships.data ?? []).map((row) => String(row.chat_id)))];
  if (!groupIds.length) return [] satisfies HomePersonCandidate[];

  const members = await admin
    .from("chat_members")
    .select("user_id")
    .in("chat_id", groupIds)
    .neq("user_id", viewerId)
    .limit(500);
  if (members.error) throw new Error(members.error.message);
  const userIds = [...new Set((members.data ?? []).map((row) => String(row.user_id)))];
  if (!userIds.length) return [] satisfies HomePersonCandidate[];

  const users = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)")
    .in("id", userIds.slice(0, 200));
  if (users.error) throw new Error(users.error.message);

  return (users.data ?? []).map((user): HomePersonCandidate => {
    const relation = user.profile_customization as CustomizationRow | CustomizationRow[] | null;
    const customization = toProfileCustomizationView(Array.isArray(relation) ? relation[0] : relation);
    return {
      id: String(user.id),
      username: String(user.username),
      displayName: String(user.display_name),
      avatarUrl: customization.assets.animatedAvatarUrl ?? null,
      avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
      avatarRingId: customization.avatarRingId ?? null,
    };
  });
}

export async function getHomeChatAttentionRest(chatIds: string[], userId: string) {
  const result = new Map<string, { unreadCount: number; mentionOrReply: boolean }>();
  if (!chatIds.length) return result;
  const admin = getAdminClient();
  const [messagesResult, viewerResult] = await Promise.all([
    admin
      .from("messages")
      .select("chat_id, text, reply_to_message_id")
      .in("chat_id", chatIds)
      .neq("sender_id", userId)
      .is("read_at", null)
      .limit(1_000),
    admin.from("users").select("username").eq("id", userId).maybeSingle(),
  ]);
  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (viewerResult.error) throw new Error(viewerResult.error.message);

  const unread = messagesResult.data ?? [];
  const replyIds = [...new Set(unread.flatMap((row) => row.reply_to_message_id ? [String(row.reply_to_message_id)] : []))];
  const repliedToViewer = new Set<string>();
  if (replyIds.length) {
    const replies = await admin.from("messages").select("id, sender_id").in("id", replyIds);
    if (replies.error) throw new Error(replies.error.message);
    for (const row of replies.data ?? []) {
      if (row.sender_id === userId) repliedToViewer.add(String(row.id));
    }
  }

  const username = typeof viewerResult.data?.username === "string" ? viewerResult.data.username : null;

  for (const row of unread) {
    const chatId = String(row.chat_id);
    const current = result.get(chatId) ?? { unreadCount: 0, mentionOrReply: false };
    current.unreadCount += 1;
    current.mentionOrReply ||= Boolean(
      (row.reply_to_message_id && repliedToViewer.has(String(row.reply_to_message_id)))
      || messageMentionsUsername(typeof row.text === "string" ? row.text : null, username),
    );
    result.set(chatId, current);
  }
  return result;
}

export async function getVisibleListeningActivityRest(viewerId: string, userIds: string[]) {
  const result = new Map<string, { title: string; artist: string | null }>();
  if (!userIds.length) return result;
  const activeAfter = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data, error } = await getAdminClient()
    .from("user_status")
    .select("user_id, track_title, track_artist, updated_at")
    .in("user_id", userIds)
    .not("track_title", "is", null)
    .gte("updated_at", activeAfter);
  if (error) throw new Error(error.message);
  await Promise.all((data ?? []).map(async (row) => {
    const userId = String(row.user_id);
    const privacy = await getUserPrivacySettingsRest(userId);
    if (!(await canViewPrivateFieldRest(userId, viewerId, privacy.musicScope))) return;
    result.set(userId, {
      title: String(row.track_title),
      artist: typeof row.track_artist === "string" ? row.track_artist : null,
    });
  }));
  return result;
}

export async function getRelationshipScoresRest(
  userId: string,
  candidates: Array<{ userId: string; chatId?: string }>,
) {
  const scores = new Map(candidates.map((candidate) => [candidate.userId, candidate.chatId ? 40 : 0]));
  if (!candidates.length) return scores;
  const candidateIds = candidates.map((candidate) => candidate.userId);
  const chatIds = candidates.flatMap((candidate) => candidate.chatId ? [candidate.chatId] : []);
  const admin = getAdminClient();
  const [outgoing, incoming, viewerInterests, candidateInterests, viewerGroups, directMessages] = await Promise.all([
    admin.from("follows").select("following_id").eq("follower_id", userId).in("following_id", candidateIds),
    admin.from("follows").select("follower_id").eq("following_id", userId).in("follower_id", candidateIds),
    admin.from("user_interests").select("interest_slug").eq("user_id", userId),
    admin.from("user_interests").select("user_id, interest_slug").in("user_id", candidateIds),
    admin.from("chat_members").select("chat_id, chats!inner(type)").eq("user_id", userId).eq("chats.type", "group"),
    chatIds.length
      ? admin.from("messages").select("chat_id, sender_id, created_at").in("chat_id", chatIds).order("created_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const failure = [outgoing, incoming, viewerInterests, candidateInterests, viewerGroups, directMessages].find((value) => value.error)?.error;
  if (failure) throw new Error(failure.message);

  const outgoingIds = new Set((outgoing.data ?? []).map((row) => String(row.following_id)));
  const incomingIds = new Set((incoming.data ?? []).map((row) => String(row.follower_id)));
  for (const candidateId of candidateIds) if (outgoingIds.has(candidateId) && incomingIds.has(candidateId)) scores.set(candidateId, (scores.get(candidateId) ?? 0) + 15);

  const ownInterests = new Set((viewerInterests.data ?? []).map((row) => String(row.interest_slug)));
  const sharedInterestUsers = new Set((candidateInterests.data ?? []).filter((row) => ownInterests.has(String(row.interest_slug))).map((row) => String(row.user_id)));
  for (const candidateId of sharedInterestUsers) scores.set(candidateId, (scores.get(candidateId) ?? 0) + 10);

  const groupIds = (viewerGroups.data ?? []).map((row) => String(row.chat_id));
  if (groupIds.length) {
    const groupMembers = await admin.from("chat_members").select("user_id").in("chat_id", groupIds).in("user_id", candidateIds);
    if (groupMembers.error) throw new Error(groupMembers.error.message);
    for (const candidateId of new Set((groupMembers.data ?? []).map((row) => String(row.user_id)))) scores.set(candidateId, (scores.get(candidateId) ?? 0) + 30);
  }

  const candidateByChat = new Map(candidates.flatMap((candidate) => candidate.chatId ? [[candidate.chatId, candidate.userId] as const] : []));
  const sendersByChat = new Map<string, Set<string>>();
  const newestByChat = new Map<string, string>();
  for (const row of directMessages.data ?? []) {
    const chatId = String(row.chat_id);
    const senders = sendersByChat.get(chatId) ?? new Set<string>();
    senders.add(String(row.sender_id)); sendersByChat.set(chatId, senders);
    if (!newestByChat.has(chatId)) newestByChat.set(chatId, String(row.created_at));
  }
  for (const [chatId, senders] of sendersByChat) {
    const candidateId = candidateByChat.get(chatId);
    if (!candidateId || !senders.has(userId) || !senders.has(candidateId)) continue;
    const ageDays = (Date.now() - Date.parse(newestByChat.get(chatId) ?? "")) / 86_400_000;
    const decayed = ageDays <= 3 ? 25 : ageDays <= 14 ? 15 : ageDays <= 60 ? 5 : 0;
    scores.set(candidateId, (scores.get(candidateId) ?? 0) + decayed);
  }
  return scores;
}
