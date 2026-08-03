"use client";

import { useCallback } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";

import { GroupManagementSheetView } from "./GroupManagementSheetView";

export function GroupInviteSheet({
  chatId,
  chatName,
  canManage,
  topicsEnabled,
  topicsLayout,
}: {
  chatId: string;
  chatName: string;
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
}) {
  const utils = trpc.useUtils();
  const createInvite = trpc.chat.createInvite.useMutation();
  const revokeInvite = trpc.chat.revokeInvite.useMutation();
  const addMembers = trpc.chat.addGroupMembers.useMutation();
  const setTopics = trpc.chat.setGroupTopics.useMutation();
  const loadMembers = useCallback(
    () => utils.client.chat.groupMembers.query({ chatId }),
    [chatId, utils.client],
  );
  const searchContacts = useCallback(
    (q: string) => utils.client.chat.groupContacts.query({ chatId, q }),
    [chatId, utils.client],
  );

  return (
    <GroupManagementSheetView
      chatName={chatName}
      canManage={canManage}
      topicsEnabled={topicsEnabled}
      topicsLayout={topicsLayout}
      loadMembers={loadMembers}
      searchContacts={searchContacts}
      addMembers={(memberIds) => addMembers.mutateAsync({ chatId, memberIds })}
      createInvite={() => createInvite.mutateAsync({ chatId })}
      revokeInvite={(token) => revokeInvite.mutateAsync({ chatId, token })}
      updateTopics={async (enabled, layout) => {
        await setTopics.mutateAsync({ chatId, enabled, layout });
        await Promise.all([
          utils.chat.getMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
      }}
      onMembersChanged={() => {
        void utils.chat.getMessages.invalidate({ chatId });
        void utils.chat.list.invalidate();
      }}
      renderAvatar={(user) => (
        <ProfileAvatar
          displayName={user.displayName}
          size="sm"
          animatedAvatarUrl={user.avatarUrl}
        />
      )}
    />
  );
}
