"use client";

import { trpc } from "@/lib/trpc/client";
import { useGroupNowRoomCreate } from "@/hooks/useGroupNowRoomCreate";
import { useGroupNowVoiceLauncher } from "@/hooks/useGroupNowVoiceLauncher";
import type { ChatGroupMemberView } from "@/types/chat";

import { GroupPeoplePanelView } from "./GroupPeoplePanelView";
import { useVoiceSession } from "./voice/VoiceSessionProvider";

export function GroupPeoplePanel({
  enabled,
  groupId,
  conversationId,
  currentUserId,
  onlineUserIds,
  onOpenProfile,
  onVoop,
  voopingUserId,
}: {
  enabled: boolean;
  groupId: string;
  conversationId: string;
  currentUserId?: string | null;
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
}) {
  const voice = useVoiceSession();
  const launcher = useGroupNowVoiceLauncher({ groupId, conversationId });
  const currentSessionId = voice.state.inside
    && voice.activeSession?.coreSession?.groupId === groupId
    ? voice.activeSession.coreSession.join.sessionId
    : null;
  const split = useGroupNowRoomCreate({
    groupId,
    currentSessionId,
    onJoined: (room, join, credentials) => launcher.openJoinedRoom(
      { groupId, room },
      join,
      credentials,
    ),
  });
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
      actionError={split.error}
      onRetry={() => void query.refetch()}
      onOpenProfile={onOpenProfile}
      currentUserId={currentUserId}
      onVoop={currentSessionId
        ? onVoop ?? ((member) => split.startSplit({
            id: member.id,
            username: member.username,
            displayName: member.displayName,
            avatarUrl: member.avatarUrl ?? null,
          }))
        : undefined}
      voopingUserId={voopingUserId ?? split.targetUserId}
    />
  );
}
