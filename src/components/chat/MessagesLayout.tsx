"use client";

import { usePathname } from "next/navigation";

import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { COPY } from "@/lib/constants/copy";
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
      listHeader={
        <SectionPageHeader
          title={COPY.messages}
          variant="plain"
          className="border-b-0 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4"
        />
      }
      list={<ChatList activeChatId={chatId} />}
      thread={children}
    />
  );
}
