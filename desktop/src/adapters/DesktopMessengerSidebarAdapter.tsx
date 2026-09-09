import type { Session } from "@supabase/supabase-js";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { MessengerSidebarView } from "@/components/layout/MessengerSidebarView";
import { useMessengerGroupLiveStates } from "@/hooks/useMessengerGroupLiveStates";
import { trpc } from "@/lib/trpc/client";

import { useDesktopChats } from "../chat/useDesktopChats";
import type { DesktopConfig } from "../config";
import { useDesktopPresence } from "../providers/DesktopPresenceProvider";
import { DesktopGroupChatCreatorAdapter } from "./DesktopGroupChatCreatorAdapter";

export function DesktopMessengerSidebarAdapter({
  pathname,
  config,
  session,
  navigate,
  renderDestination,
}: {
  pathname: string;
  config: DesktopConfig;
  session: Session;
  navigate: (href: string) => void;
  renderDestination: NavigationDestinationRenderer;
}) {
  const onlineUserIds = useDesktopPresence();
  const { liveByGroup } = useMessengerGroupLiveStates();
  const { chats, error, loading, refresh, retry } = useDesktopChats();
  const savedMessages = trpc.savedMessages.availability.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  return (
    <MessengerSidebarView
      pathname={pathname}
      chats={chats}
      loading={loading}
      error={error}
      onlineUserIds={onlineUserIds}
      liveByGroup={liveByGroup}
      createGroupAction={
        <DesktopGroupChatCreatorAdapter
          config={config}
          session={session}
          variant="sidebar"
          onCreated={(chatId) => {
            void refresh();
            navigate(`/messages/${chatId}`);
          }}
        />
      }
      savedMessagesEnabled={savedMessages.data?.enabled === true}
      renderDestination={renderDestination}
      onRetry={() => void retry()}
    />
  );
}
