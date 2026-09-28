"use client";

import Link from "next/link";
import { useState } from "react";

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
  const utils = trpc.useUtils();
  const toggleFavorite = trpc.chat.toggleSectionFavorite.useMutation();
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const rootChat = chats?.find(
    (chat) => chat.id === chatId || chat.channels.some((section) => section.id === chatId),
  );
  if (!rootChat) return null;

  return (
    <ChatSectionsBarView
      rootChat={rootChat}
      activeChatId={chatId}
      createAction={({ open, onOpenChange }) => (
        <SubchatCreator
          parentChatId={rootChat.id}
          viewerRole={viewerRole}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
      pendingFavoriteId={pendingFavoriteId}
      favoriteError={favoriteError}
      onToggleFavorite={async (sectionId) => {
        setPendingFavoriteId(sectionId);
        setFavoriteError(null);
        try {
          await toggleFavorite.mutateAsync({ sectionId });
          await utils.chat.list.invalidate();
        } catch (error) {
          setFavoriteError(
            error instanceof Error
              ? error.message
              : "Не удалось обновить избранное",
          );
        } finally {
          setPendingFavoriteId(null);
        }
      }}
      renderDestination={(chat, className, children, onNavigate) => (
        <Link key={chat.id} href={`/messages/${chat.id}`} className={className} onClick={onNavigate}>
          {children}
        </Link>
      )}
    />
  );
}
