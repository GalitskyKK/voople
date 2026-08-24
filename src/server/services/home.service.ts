import "server-only";

import { listChats } from "@/server/services/chat.service";
import {
  getActiveRoomPresenceRest,
  getHomeChatAttentionRest,
  getRelationshipScoresRest,
  getVisibleListeningActivityRest,
} from "@/server/data/home-overview-rest";
import { listVisibleOnlineUserIdsRest } from "@/server/data/privacy-rest";
import { listContactPinsRest } from "@/server/data/contact-pins-rest";
import { fetchCurrentUserSummary } from "@/server/data/users-rest";
import { scoreHomeContinue, scoreHomeNow } from "@/lib/social/home-ranking";
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

function takeUniqueItems(items: HomeNowItem[], limit: number) {
  const seen = new Set<string>();
  const result: HomeNowItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length === limit) break;
  }
  return result;
}

export async function getHomeOverview(userId: string): Promise<HomeOverviewView> {
  const chats = await listChats(userId);
  const rootChats = chats.filter((chat) => !chat.parentChatId);
  const directChats = rootChats.filter((chat) => chat.type === "direct" && chat.otherUser);
  const relationshipCandidates = directChats.map((chat) => ({ userId: chat.otherUser!.id, chatId: chat.id }));
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
  const now = takeUniqueItems(
    [...activeRooms, ...direct.filter((item) => item.activity)].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    5,
  );
  return {
    viewer: viewer ? {
      id: viewer.id,
      kind: "person",
      title: viewer.displayName,
      subtitle: `@${viewer.username}`,
      href: "/me",
      avatarUrl: viewer.avatarUrl ?? null,
      userId: viewer.id,
      online: true,
    } : null,
    now,
    continue: rootChats.flatMap((chat) => {
      const item = itemById.get(chat.id);
      if (!item?.subtitle || activeRooms.some((room) => room.id === chat.id)) return [];
      const unreadCount = attention.get(chat.id)?.unreadCount ?? 0;
      const relationshipScore = item.userId ? relationshipScores.get(item.userId) ?? 0 : 0;
      const score = scoreHomeContinue({
        unreadCount,
        lastInteractionAt: chat.lastMessage?.createdAt,
        reciprocal: relationshipScore >= 65,
        recentlyOpened: true,
      });
      return [{ ...item, unreadCount, score }];
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4),
    communities: groups.slice(0, 3).map((item) => ({
      ...item,
      subtitle: `${chats.find((chat) => chat.id === item.id)?.memberCount ?? 0} участников`,
    })),
  };
}
