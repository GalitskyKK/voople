import "server-only";

import { listChats } from "@/server/services/chat.service";
import { getActiveRoomCountsRest } from "@/server/data/home-overview-rest";
import { fetchCurrentUserSummary } from "@/server/data/users-rest";
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
    online: Boolean(chat.otherUser.lastSeenAt && Date.parse(chat.otherUser.lastSeenAt) > Date.now() - 5 * 60_000),
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
  const [viewer, roomCounts] = await Promise.all([
    fetchCurrentUserSummary(userId),
    getActiveRoomCountsRest(rootChats.map((chat) => chat.id)),
  ]);
  const direct = chats.map((chat) => directItem(chat, userId)).filter((item): item is HomeNowItem => Boolean(item));
  const groups = chats.map((chat) => groupItem(chat, userId)).filter((item): item is HomeNowItem => Boolean(item));
  const itemById = new Map([...direct, ...groups].map((item) => [item.id, item]));
  const activeRooms = groups.flatMap((item) => {
    const participantCount = roomCounts.get(item.id) ?? 0;
    return participantCount > 0
      ? [{ ...item, kind: "room" as const, subtitle: `${participantCount} в комнате · Зайти` }]
      : [];
  });
  const now = takeUniqueItems(
    [...activeRooms, ...direct.filter((item) => item.online)],
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
      return item?.subtitle ? [item] : [];
    }).slice(0, 3),
    communities: groups.slice(0, 3).map((item) => ({
      ...item,
      subtitle: `${chats.find((chat) => chat.id === item.id)?.memberCount ?? 0} участников`,
    })),
  };
}
