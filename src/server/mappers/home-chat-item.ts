import type { ChatListItem } from "@/types/chat";
import type { HomeNowItem } from "@/types/home";

function lastConversationPreview(chat: ChatListItem, userId: string) {
  if (!chat.lastMessage) return null;
  return `${chat.lastMessage.senderId === userId ? "Вы: " : ""}${chat.lastMessage.preview}`;
}

export function toHomeDirectItem(chat: ChatListItem, userId: string): HomeNowItem | null {
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

export function toHomeGroupItem(chat: ChatListItem, userId: string): HomeNowItem | null {
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
