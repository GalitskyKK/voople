"use client";

import { useState, type ReactNode } from "react";
import type { ChatGroupMemberView } from "@/types/chat";

import { GroupNowVoicePanel } from "./GroupNowVoicePanel";
import { GroupPeoplePanel } from "./GroupPeoplePanel";
import { GroupSurfaceTabs, type GroupSurfaceTab } from "./GroupSurfaceTabs";
import { GroupSurfaceNavigationContext } from "./GroupSurfaceNavigationContext";

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

export function GroupSurfaceShell({
  chatContent,
  config,
  header,
}: {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={config.combineHeader ? "voople-group-surface-header voople-group-surface-header--combined" : "voople-group-surface-header"}>
        {header}
        <GroupSurfaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      {activeTab === "chat" ? (
        <>
          <GroupNowVoicePanel enabled groupId={config.groupId} conversationId={config.conversationId} groupName={config.groupName} canCreatePinned={config.canCreatePinned} variant="shelf" onOpenProfile={openProfile} />
          {chatContent}
        </>
      ) : activeTab === "now" ? (
        <div className="voople-scroll min-h-0 flex-1 overflow-y-auto">
          <GroupNowVoicePanel enabled groupId={config.groupId} conversationId={config.conversationId} groupName={config.groupName} canCreatePinned={config.canCreatePinned} variant="surface" onOpenProfile={openProfile} />
        </div>
      ) : (
        <GroupPeoplePanel
          enabled
          groupId={config.groupId}
          conversationId={config.conversationId}
          currentUserId={config.currentUserId}
          onlineUserIds={config.onlineUserIds}
          onOpenProfile={config.onOpenProfile}
          onVoop={config.onVoop}
          voopingUserId={config.voopingUserId}
        />
      )}
    </div>
    </GroupSurfaceNavigationContext.Provider>
  );
}
