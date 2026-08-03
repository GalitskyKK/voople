"use client";

import Link from "next/link";

import { trpc } from "@/lib/trpc/client";

import { ChatSectionsBarView } from "./ChatSectionsBarView";

export function ChatSectionsBar({ chatId }: { chatId: string }) {
  const { data: chats } = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });
  const rootChat = chats?.find(
    (chat) => chat.id === chatId || chat.channels.some((section) => section.id === chatId),
  );
  if (!rootChat) return null;

  return (
    <ChatSectionsBarView
      rootChat={rootChat}
      activeChatId={chatId}
      renderDestination={(chat, className, children) => (
        <Link key={chat.id} href={`/messages/${chat.id}`} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
