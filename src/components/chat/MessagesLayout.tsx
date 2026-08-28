"use client";

import { usePathname, useRouter } from "next/navigation";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { activeMessagesChatId } from "@/lib/layout/messages-path";
import { trpc } from "@/lib/trpc/client";
import { useConversationExit } from "@/hooks/useConversationExit";

import { ChatList } from "./ChatList";
import { MessagesLayoutView } from "./MessagesLayoutView";

export function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chatId = activeMessagesChatId(pathname);
  const { preferences } = useAppPreferences();
  const subscription = trpc.shop.subscriptionStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const wallpaper =
    preferences.chatWallpaper === "aurora" && !subscription.data?.active
      ? "doodles"
      : preferences.chatWallpaper;

  useConversationExit({
    active: Boolean(chatId),
    onExit: () => router.replace("/messages"),
  });

  return (
    <MessagesLayoutView
      isThread={Boolean(chatId)}
      wallpaper={wallpaper}
      list={<ChatList activeChatId={chatId} />}
      thread={children}
    />
  );
}
