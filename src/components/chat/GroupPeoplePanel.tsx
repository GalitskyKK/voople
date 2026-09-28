"use client";

import { trpc } from "@/lib/trpc/client";
import { currentSessionParticipantIds } from "@/lib/chat/group-people";
import { useGroupNowRoomCreate } from "@/hooks/useGroupNowRoomCreate";
import { useGroupNowVoiceLauncher } from "@/hooks/useGroupNowVoiceLauncher";
import type { ChatGroupMemberView } from "@/types/chat";
import { GroupPeoplePanelView } from "./GroupPeoplePanelView";
import { useVoiceSession } from "./voice/VoiceSessionProvider";

type Props = {
  enabled: boolean;
  groupId: string;
  conversationId: string;
  currentUserId?: string | null;
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
  nowRefreshedElsewhere?: boolean;
  allowVoop?: boolean;
};

export function GroupPeoplePanel(props: Props) {
  return props.allowVoop === false
    ? <GroupPeopleDirectory {...props} currentSessionId={null} onVoop={undefined} voopingUserId={null} />
    : <GroupPeopleWithVoop {...props} />;
}

function GroupPeopleWithVoop(props: Props) {
  const voice = useVoiceSession();
  const launcher = useGroupNowVoiceLauncher({
    groupId: props.groupId,
    conversationId: props.conversationId,
  });
  const currentSessionId = voice.state.inside
    && voice.activeSession?.coreSession?.groupId === props.groupId
    ? voice.activeSession.coreSession.join.sessionId
    : null;
  const split = useGroupNowRoomCreate({
    groupId: props.groupId,
    currentSessionId,
    onJoined: (room, join, credentials) => launcher.openJoinedRoom(
      { groupId: props.groupId, room }, join, credentials,
    ),
  });
  return <GroupPeopleDirectory {...props} currentSessionId={currentSessionId}
    actionError={split.error}
    onVoop={currentSessionId
      ? props.onVoop ?? ((member) => split.startVoop({
          id: member.id,
          username: member.username,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl ?? null,
        }))
      : undefined}
    voopingUserId={props.voopingUserId ?? split.targetUserId} />;
}

function GroupPeopleDirectory({
  enabled, groupId, currentUserId, onlineUserIds, onOpenProfile,
  onVoop, voopingUserId, nowRefreshedElsewhere = false,
  currentSessionId, actionError,
}: Props & { currentSessionId: string | null; actionError?: string | null }) {
  const query = trpc.chat.groupMembers.useQuery(
    { chatId: groupId },
    { enabled, retry: false, staleTime: 10_000 },
  );
  const now = trpc.chat.coreGroupNow.useQuery(
    { groupId },
    { enabled, retry: false, refetchInterval: enabled && !nowRefreshedElsewhere ? 15_000 : false },
  );
  const currentParticipantIds = currentSessionParticipantIds(now.data, currentSessionId);

  if (!enabled) return null;
  return <GroupPeoplePanelView
    members={query.data}
    now={now.data}
    onlineUserIds={onlineUserIds}
    loading={query.isLoading || now.isLoading}
    error={query.error?.message ?? now.error?.message}
    actionError={actionError}
    onRetry={() => { void query.refetch(); void now.refetch(); }}
    onOpenProfile={onOpenProfile}
    currentUserId={currentUserId}
    currentParticipantIds={currentParticipantIds}
    onVoop={onVoop}
    voopingUserId={voopingUserId}
  />;
}
