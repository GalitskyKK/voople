"use client";

import Link from "next/link";

import { trpc } from "@/lib/trpc/client";

import { GroupInviteSheet } from "./GroupInviteSheet";

export function GroupSettingsPage({ chatId }: { chatId: string }) {
  const query = trpc.chat.getMessages.useQuery({ chatId });

  if (query.isLoading) {
    return <div className="m-5 min-h-80 flex-1 animate-pulse rounded-3xl bg-[var(--app-surface-soft)]" />;
  }
  if (query.error || !query.data) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Настройки недоступны</h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">{query.error?.message ?? "Группа не найдена"}</p>
          <Link href={`/messages/${chatId}`} className="voople-link mt-4 inline-block">Вернуться в чат</Link>
        </div>
      </div>
    );
  }

  const chat = query.data.chat;
  if (chat.type !== "group" || chat.parentChatId) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <p className="text-sm text-[var(--app-muted)]">Настройки доступны только для основной группы.</p>
      </div>
    );
  }

  const canManage = chat.viewerRole === "owner" || chat.viewerRole === "admin";
  return (
    <GroupInviteSheet
      chatId={chatId}
      chatName={chat.name || "Группа"}
      memberCount={chat.memberCount}
      groupIcon={chat.groupIcon}
      groupAvatarUrl={chat.groupAvatarUrl}
      groupAccentColor={chat.groupAccentColor}
      groupTag={chat.groupTag}
      viewerRole={chat.viewerRole}
      canManage={canManage}
      topicsEnabled={chat.topicsEnabled}
      topicsLayout={chat.topicsLayout}
      groupVisibility={chat.groupVisibility}
      presentation="page"
    />
  );
}
