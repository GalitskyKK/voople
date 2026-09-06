"use client";

import { trpc } from "@/lib/trpc/client";

import { GroupPeoplePanelView } from "./GroupPeoplePanelView";

export function GroupPeoplePanel({
  enabled,
  groupId,
  onlineUserIds,
  onOpenProfile,
}: {
  enabled: boolean;
  groupId: string;
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
}) {
  const query = trpc.chat.groupMembers.useQuery(
    { chatId: groupId },
    { enabled, retry: false, staleTime: 10_000 },
  );

  if (!enabled) return null;

  return (
    <GroupPeoplePanelView
      members={query.data}
      onlineUserIds={onlineUserIds}
      loading={query.isLoading}
      error={query.error?.message}
      onRetry={() => void query.refetch()}
      onOpenProfile={onOpenProfile}
    />
  );
}
