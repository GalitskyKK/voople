"use client";

import { usePathname } from "next/navigation";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { activeMessagesChatId } from "@/lib/layout/messages-path";
import { trpc } from "@/lib/trpc/client";

import { ChatList } from "./ChatList";
import { MessagesLayoutView } from "./MessagesLayoutView";

export function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  return (
    <MessagesLayoutView
      isThread={Boolean(chatId)}
      wallpaper={wallpaper}
      list={<ChatList activeChatId={chatId} />}
      thread={children}
    />
  );
}
