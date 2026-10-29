import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { AccountMenuVisual } from "@/components/layout/AccountMenuVisual";
import {
  AppSidebarVisual,
  type NavigationDestinationRenderer,
} from "@/components/layout/AppNavigationVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { useSidebarPreference } from "@/hooks/useSidebarPreference";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { resolveRingStyle } from "@/lib/customization/rings";

import type { DesktopConfig } from "../config";
import { DesktopMessengerSidebarAdapter } from "./DesktopMessengerSidebarAdapter";

type ViewerSummary = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarDecorationUrl?: string | null;
  avatarRingId?: string | null;
};

export function DesktopAppSidebarAdapter({
  pathname,
  config,
  session,
  viewer,
  notificationBadge,
  renderDestination,
  navigate,
}: {
  pathname: string;
  config: DesktopConfig;
  session: Session;
  viewer: ViewerSummary | null;
  notificationBadge?: ReactNode;
  renderDestination: NavigationDestinationRenderer;
  navigate: (href: string) => void;
}) {
  const orbit = useInterfaceDesign() === "orbit";
  const { collapsed, setCollapsed } = useSidebarPreference({ forceExpanded: !orbit });
  // Keep the same social rail across every authenticated desktop route.
  const messengerShell = true;

  return (
    <AppSidebarVisual
      pathname={pathname}
      collapsed={collapsed}
      onCollapsedChange={orbit ? setCollapsed : undefined}
      accountPlacement={orbit ? "dock" : "sidebar"}
      notificationBadge={notificationBadge}
      renderDestination={renderDestination}
      primaryNavigation={
        messengerShell ? (
          <DesktopMessengerSidebarAdapter
            pathname={pathname}
            config={config}
            session={session}
            navigate={navigate}
            renderDestination={renderDestination}
          />
        ) : undefined
      }
      accountNavigation={
        viewer ? (
          <AccountMenuVisual
            displayName={viewer.displayName}
            username={viewer.username}
            compact={collapsed && !orbit}
            variant={orbit ? "dock" : "menu"}
            avatar={
              <ProfileAvatarVisual
                displayName={viewer.displayName}
                size="sm"
                shape={messengerShell ? "square" : "round"}
                ringClassName={resolveRingStyle(viewer.avatarRingId)?.className}
                avatarImage={
                  viewer.avatarUrl ? (
                    <img
                      src={viewer.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : undefined
                }
                decorationImage={
                  viewer.avatarDecorationUrl ? (
                    <img
                      src={viewer.avatarDecorationUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : undefined
                }
              />
            }
            onOpenProfile={() => navigate("/me")}
            onOpenHelp={() => navigate("/help")}
            onOpenSettings={() => navigate("/settings")}
            onLogout={() => navigate("/login")}
          />
        ) : undefined
      }
    />
  );
}
