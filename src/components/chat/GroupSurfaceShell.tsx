"use client";

import { useState, type ReactNode } from "react";
import type { ChatGroupMemberView } from "@/types/chat";
import { GroupNowVoicePanel } from "./GroupNowVoicePanel";
import { GroupPeoplePanel } from "./GroupPeoplePanel";
import type { GroupSurfaceTab } from "./GroupSurfaceTabs";
import { GroupSurfaceNavigationContext } from "./GroupSurfaceNavigationContext";
import { GroupWorkspaceView } from "./GroupWorkspaceView";

export type GroupSurfaceConfig = {
  groupId: string;
  conversationId: string;
  currentUserId?: string | null;
  groupName: string;
  initialTab?: GroupSurfaceTab;
  combineHeader?: boolean;
  canCreatePinned: boolean;
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
};

export function GroupSurfaceShell({ chatContent, config, header }: {
  chatContent: ReactNode;
  config: GroupSurfaceConfig;
  header: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<GroupSurfaceTab>(config.initialTab ?? "now");
  const openProfile = config.onOpenProfile
    ? (user: { username: string }) => config.onOpenProfile?.(user.username)
    : undefined;

  return (
    <GroupSurfaceNavigationContext.Provider value={setActiveTab}>
      <GroupWorkspaceView header={header} chat={chatContent}
        activeTab={activeTab} onTabChange={setActiveTab} combineHeader={config.combineHeader}
        live={<GroupNowVoicePanel enabled groupId={config.groupId}
          conversationId={config.conversationId} groupName={config.groupName}
          canCreatePinned={config.canCreatePinned} variant="surface" onOpenProfile={openProfile} />}
        renderPeople={(desktop) => <GroupPeoplePanel enabled groupId={config.groupId}
          conversationId={config.conversationId} currentUserId={config.currentUserId}
          onlineUserIds={config.onlineUserIds} onOpenProfile={config.onOpenProfile}
          onVoop={config.onVoop} voopingUserId={config.voopingUserId}
          nowRefreshedElsewhere={desktop} allowVoop={!desktop} />}
      />
    </GroupSurfaceNavigationContext.Provider>
  );
}
