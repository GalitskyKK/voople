import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";

import type { DesktopConfig } from "../config";
import { useDesktopNotifications } from "./useDesktopNotifications";

export function DesktopNotifications({
  config,
  session,
  onUnreadCountChange,
  renderDestination,
}: {
  config: DesktopConfig;
  session: Session;
  onUnreadCountChange: (count: number) => void;
  renderDestination: NavigationDestinationRenderer;
}) {
  const notifications = useDesktopNotifications(config, session);

  useEffect(() => {
    onUnreadCountChange(notifications.unreadCount);
  }, [notifications.unreadCount, onUnreadCountChange]);

  return (
    <AppPageContent>
      <NotificationsView
        items={notifications.items}
        loading={notifications.loading}
        error={notifications.error}
        markingRead={notifications.markingRead}
        onMarkAllRead={() => void notifications.markAllRead()}
        onRetry={notifications.retry}
        renderDestination={renderDestination}
        badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
      />
    </AppPageContent>
  );
}
