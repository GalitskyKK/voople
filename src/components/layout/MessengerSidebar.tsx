"use client";

import { GroupChatCreator } from "@/components/chat/GroupChatCreator";
import { trpc } from "@/lib/trpc/client";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import { useMessengerGroupLiveStates } from "@/hooks/useMessengerGroupLiveStates";

import type { NavigationDestinationRenderer } from "./AppNavigationVisual";
import { MessengerSidebarView } from "./MessengerSidebarView";

export function MessengerSidebar({
  pathname,
  renderDestination,
}: {
  pathname: string;
  renderDestination: NavigationDestinationRenderer;
}) {
  const { onlineUserIds } = useOnlineUsers();
  const { liveByGroup } = useMessengerGroupLiveStates();
  const chats = trpc.chat.list.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  return (
    <MessengerSidebarView
      pathname={pathname}
      chats={chats.data ?? []}
      loading={chats.isLoading}
      error={chats.error?.message}
      onlineUserIds={onlineUserIds}
      liveByGroup={liveByGroup}
      createGroupAction={<GroupChatCreator variant="sidebar" />}
      renderDestination={renderDestination}
      onRetry={() => void chats.refetch()}
    />
  );
}
