import "server-only";

import { listChats } from "@/server/services/chat.service";
import {
  getActiveRoomPresenceRest,
  getHomeChatAttentionRest,
  getRelationshipScoresRest,
  getVisibleListeningActivityRest,
  listSharedGroupPeopleRest,
} from "@/server/data/home-overview-rest";
import { listVisibleOnlineUserIdsRest } from "@/server/data/privacy-rest";
import { listContactPinsRest } from "@/server/data/contact-pins-rest";
import { fetchCurrentUserSummary } from "@/server/data/users-rest";
import { scoreHomeContinue, scoreHomeNow, selectRankedHomeItems } from "@/lib/social/home-ranking";
import type { HomeNowItem, HomeOverviewView } from "@/types/home";

function lastConversationPreview(
  chat: Awaited<ReturnType<typeof listChats>>[number],
  userId: string,
) {
  if (!chat.lastMessage) return null;
  return `${chat.lastMessage.senderId === userId ? "Вы: " : ""}${chat.lastMessage.preview}`;
}

function directItem(chat: Awaited<ReturnType<typeof listChats>>[number], userId: string): HomeNowItem | null {
  if (chat.type !== "direct" || !chat.otherUser) return null;
  return {
    id: chat.id,
    kind: "person",
    title: chat.otherUser.displayName,
    subtitle: lastConversationPreview(chat, userId) || `@${chat.otherUser.username}`,
    href: `/messages/${chat.id}`,
    avatarUrl: chat.otherUser.avatarUrl,
    avatarDecorationUrl: chat.otherUser.avatarDecorationUrl,
    avatarRingId: chat.otherUser.avatarRingId,
    userId: chat.otherUser.id,
    online: false,
  };
}

function groupItem(chat: Awaited<ReturnType<typeof listChats>>[number], userId: string): HomeNowItem | null {
  if (chat.type !== "group" || chat.parentChatId) return null;
  return {
    id: chat.id,
    kind: "group",
    title: chat.name?.trim() || "Группа",
    subtitle: lastConversationPreview(chat, userId) || `${chat.memberCount} участников`,
    href: `/messages/${chat.id}`,
    avatarUrl: chat.groupAvatarUrl,
    userId: null,
    online: false,
  };
}

export async function getHomeOverview(userId: string): Promise<HomeOverviewView> {
  const chats = await listChats(userId);
  const rootChats = chats.filter((chat) => !chat.parentChatId);
  const directChats = rootChats.filter((chat) => chat.type === "direct" && chat.otherUser);
  const sharedGroupPeople = await listSharedGroupPeopleRest(userId);
  const directUserIds = new Set(directChats.map((chat) => chat.otherUser!.id));
  const sharedOnlyPeople = sharedGroupPeople.filter((person) => !directUserIds.has(person.id));
  const relationshipCandidates = [
    ...directChats.map((chat) => ({ userId: chat.otherUser!.id, chatId: chat.id })),
    ...sharedOnlyPeople.map((person) => ({ userId: person.id })),
  ];
  const [viewer, roomPresence, attention, visibleOnlineIds, listeningActivity, relationshipScores, pinnedUserIds] = await Promise.all([
    fetchCurrentUserSummary(userId),
    getActiveRoomPresenceRest(rootChats.map((chat) => chat.id), userId),
    getHomeChatAttentionRest(rootChats.map((chat) => chat.id), userId),
    listVisibleOnlineUserIdsRest(userId),
    getVisibleListeningActivityRest(userId, relationshipCandidates.map((candidate) => candidate.userId)),
    getRelationshipScoresRest(userId, relationshipCandidates),
    listContactPinsRest(userId),
  ]);
  const visibleOnline = new Set(visibleOnlineIds);
  const pinnedUsers = new Set(pinnedUserIds);
  const direct = chats.map((chat) => directItem(chat, userId)).filter((item): item is HomeNowItem => Boolean(item)).map((item) => {
    const chat = rootChats.find((candidate) => candidate.id === item.id);
    const lastInteractionAt = chat?.lastMessage?.createdAt;
    const listening = item.userId ? listeningActivity.get(item.userId) : null;
    const online = Boolean(item.userId && visibleOnline.has(item.userId));
    const relationshipScore = item.userId ? relationshipScores.get(item.userId) ?? 0 : 0;
    const pinned = Boolean(item.userId && pinnedUsers.has(item.userId));
    return {
      ...item,
      online,
      activity: listening ? "listening" as const : online ? "online" as const : undefined,
      subtitle: listening ? `Слушает ${[listening.artist, listening.title].filter(Boolean).join(" — ")}` : item.subtitle,
      pinned,
      score: scoreHomeNow({ pinned, listening: Boolean(listening), online, lastInteractionAt, relationshipScore: relationshipScore + (pinned ? 30 : 0) }),
    };
  });
  const sharedPeople = sharedOnlyPeople.map((person): HomeNowItem => {
    const listening = listeningActivity.get(person.id);
    const online = visibleOnline.has(person.id);
    const pinned = pinnedUsers.has(person.id);
    const relationshipScore = relationshipScores.get(person.id) ?? 0;
    return {
      id: `person-${person.id}`,
      kind: "person",
      title: person.displayName,
      subtitle: listening
        ? `Слушает ${[listening.artist, listening.title].filter(Boolean).join(" — ")}`
        : `@${person.username}`,
      href: `/${person.username}`,
      avatarUrl: person.avatarUrl,
      avatarDecorationUrl: person.avatarDecorationUrl,
      avatarRingId: person.avatarRingId,
      userId: person.id,
      messageUsername: person.username,
      online,
      activity: listening ? "listening" : online ? "online" : undefined,
      pinned,
      score: scoreHomeNow({
        pinned,
        listening: Boolean(listening),
        online,
        relationshipScore: relationshipScore + (pinned ? 30 : 0),
      }),
    };
  });
  const groups = chats.map((chat) => groupItem(chat, userId)).filter((item): item is HomeNowItem => Boolean(item));
  const itemById = new Map([...direct, ...groups].map((item) => [item.id, item]));
  const activeRooms = [...groups, ...direct].flatMap((item) => {
    const participants = roomPresence.get(item.id) ?? [];
    return participants.length > 0
      ? [{
          ...item,
          kind: "room" as const,
          activity: "in_room" as const,
          score: scoreHomeNow({ activeRoom: true, pinned: item.pinned }),
          subtitle: `${participants.length} ${item.userId ? "в разговоре" : "в комнате"} · Зайти`,
          participants,
        }]
      : [];
  });
  const now = selectRankedHomeItems(
    [...activeRooms, ...direct.filter((item) => item.activity), ...sharedPeople.filter((item) => item.activity)],
    { limit: 5, minimumScore: 1 },
  );
  const activeRoomIds = new Set(activeRooms.map((room) => room.id));
  const continueItems = rootChats.flatMap((chat) => {
    const item = itemById.get(chat.id);
    if (!item?.subtitle) return [];
    const chatAttention = attention.get(chat.id);
    const unreadCount = chatAttention?.unreadCount ?? 0;
    const relationshipScore = item.userId ? relationshipScores.get(item.userId) ?? 0 : 0;
    const score = scoreHomeContinue({
      mentionOrReply: chatAttention?.mentionOrReply,
      unreadCount,
      lastInteractionAt: chat.lastMessage?.createdAt,
      reciprocal: relationshipScore >= 65,
    });
    return [{ ...item, unreadCount, score }];
  });
  return {
    viewer: viewer ? {
      id: viewer.id,
      kind: "person",
      title: viewer.displayName,
      subtitle: `@${viewer.username}`,
      href: "/me",
      avatarUrl: viewer.avatarUrl ?? null,
      avatarDecorationUrl: viewer.avatarDecorationUrl ?? null,
      avatarRingId: viewer.avatarRingId ?? null,
      userId: viewer.id,
      online: true,
    } : null,
    now,
    continue: selectRankedHomeItems(continueItems, {
      excludeIds: activeRoomIds,
      limit: 4,
      minimumScore: 1,
    }),
    communities: groups.slice(0, 3).map((item) => ({
      ...item,
      subtitle: `${chats.find((chat) => chat.id === item.id)?.memberCount ?? 0} участников`,
    })),
  };
}
