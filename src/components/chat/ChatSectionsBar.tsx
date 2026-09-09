"use client";

import Link from "next/link";

import { trpc } from "@/lib/trpc/client";

import { ChatSectionsBarView } from "./ChatSectionsBarView";
import { SubchatCreator } from "./SubchatCreator";

export function ChatSectionsBar({
  chatId,
  viewerRole,
}: {
  chatId: string;
  viewerRole: "owner" | "admin" | "member";
}) {
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
      createAction={
        <SubchatCreator
          parentChatId={rootChat.id}
          viewerRole={viewerRole}
        />
      }
      renderDestination={(chat, className, children, onNavigate) => (
        <Link key={chat.id} href={`/messages/${chat.id}`} className={className} onClick={onNavigate}>
          {children}
        </Link>
      )}
    />
  );
}
