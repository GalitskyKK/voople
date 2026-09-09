"use client";

import { useState, type ReactNode } from "react";

import { GroupNowVoicePanel } from "./GroupNowVoicePanel";
import { GroupPeoplePanel } from "./GroupPeoplePanel";
import { GroupSurfaceTabs, type GroupSurfaceTab } from "./GroupSurfaceTabs";

export type GroupSurfaceConfig = {
  groupId: string;
  groupName: string;
  initialTab?: GroupSurfaceTab;
  combineHeader?: boolean;
  canCreatePinned: boolean;
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
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
  const [activeTab, setActiveTab] = useState<GroupSurfaceTab>(config.initialTab ?? "chat");

  const openProfile = config.onOpenProfile
    ? (user: { username: string }) => config.onOpenProfile?.(user.username)
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={config.combineHeader ? "voople-group-surface-header voople-group-surface-header--combined" : "voople-group-surface-header"}>
        {header}
        <GroupSurfaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      {activeTab === "chat" ? (
        <>
          <GroupNowVoicePanel enabled groupId={config.groupId} groupName={config.groupName} canCreatePinned={config.canCreatePinned} variant="shelf" onOpenProfile={openProfile} />
          {chatContent}
        </>
      ) : activeTab === "now" ? (
        <div className="voople-scroll min-h-0 flex-1 overflow-y-auto">
          <GroupNowVoicePanel enabled groupId={config.groupId} groupName={config.groupName} canCreatePinned={config.canCreatePinned} variant="surface" onOpenProfile={openProfile} />
        </div>
      ) : (
        <GroupPeoplePanel enabled groupId={config.groupId} onlineUserIds={config.onlineUserIds} onOpenProfile={config.onOpenProfile} />
      )}
    </div>
  );
}
