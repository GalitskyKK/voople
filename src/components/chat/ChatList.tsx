"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useRealtimeInbox } from "@/hooks/useRealtimeChat";
import { trpc } from "@/lib/trpc/client";

export function ChatList() {
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  useRealtimeInbox(me?.id);

  const { data, isLoading, error } = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="mt-4 h-32 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (error) {
    return <p className="mt-4 text-sm text-red-400">{error.message}</p>;
  }

  if (!data?.length) {
    return (
      <p className="mt-4 text-sm text-white/50">
        Пока нет диалогов. Найдите человека в поиске и нажмите «Написать» на профиле.
      </p>
    );
  }

  return (
    <ul className="voople-chat-list mt-4 space-y-2">
      {data.map((chat) => {
        const title = chat.otherUser?.displayName ?? "Чат";
        const preview = chat.lastMessage?.text ?? "Нет сообщений";

        return (
          <li key={chat.id}>
            <Link
              href={`/messages/${chat.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-3 py-3 hover:bg-white/5"
            >
              <ProfileAvatar displayName={title} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <DisplayNameWithPin
                    hasVooplePlus={chat.otherUser?.hasVooplePlus}
                    size="sm"
                    className="min-w-0 font-medium text-white"
                  >
                    {title}
                  </DisplayNameWithPin>
                  {chat.lastMessage && (
                    <RelativeTime
                      iso={chat.lastMessage.createdAt}
                      className="shrink-0 text-xs text-white/40"
                    />
                  )}
                </div>
                <p className="truncate text-sm text-white/50">@{chat.otherUser?.username}</p>
                <p className="mt-1 truncate text-sm text-white/60">{preview}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
