"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { trpc } from "@/lib/trpc/client";

import { GroupManagementSheetView } from "./GroupManagementSheetView";

export function GroupInviteSheet({
  chatId,
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupAccentColor,
  triggerVariant = "toolbar",
  viewerRole,
  canManage,
  topicsEnabled,
  topicsLayout,
  groupVisibility,
}: {
  chatId: string;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupAccentColor: string | null;
  triggerVariant?: "toolbar" | "identity";
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  groupVisibility: "private" | "public";
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createInvite = trpc.chat.createInvite.useMutation();
  const revokeInvite = trpc.chat.revokeInvite.useMutation();
  const addMembers = trpc.chat.addGroupMembers.useMutation();
  const setTopics = trpc.chat.setGroupTopics.useMutation();
  const setVisibility = trpc.chat.setGroupVisibility.useMutation();
  const updateCustomization = trpc.chat.updateGroupCustomization.useMutation();
  const setBoost = trpc.chat.setGroupBoost.useMutation();
  const removeMember = trpc.chat.removeGroupMember.useMutation();
  const setMemberRole = trpc.chat.setGroupMemberRole.useMutation();
  const transferOwnership = trpc.chat.transferGroupOwnership.useMutation();
  const leaveGroup = trpc.chat.leaveGroup.useMutation();
  const deleteGroup = trpc.chat.deleteGroup.useMutation();
  const avatarUpload = useMediaUpload("group-avatar");
  const loadMembers = useCallback(
    () => utils.client.chat.groupMembers.query({ chatId }),
    [chatId, utils.client],
  );
  const loadCommunity = useCallback(
    () => utils.client.chat.groupCommunity.query({ chatId }),
    [chatId, utils.client],
  );
  const loadAudit = useCallback(
    () => utils.client.chat.groupAudit.query({ chatId, limit: 50 }),
    [chatId, utils.client],
  );
  const searchContacts = useCallback(
    (q: string) => utils.client.chat.groupContacts.query({ chatId, q }),
    [chatId, utils.client],
  );

  return (
    <GroupManagementSheetView
      chatName={chatName}
      memberCount={memberCount}
      groupIcon={groupIcon}
      groupAvatarUrl={groupAvatarUrl}
      groupAccentColor={groupAccentColor}
      triggerVariant={triggerVariant}
      viewerRole={viewerRole}
      canManage={canManage}
      topicsEnabled={topicsEnabled}
      topicsLayout={topicsLayout}
      groupVisibility={groupVisibility}
      loadMembers={loadMembers}
      loadAudit={loadAudit}
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
      updateVisibility={async (visibility) => {
        await setVisibility.mutateAsync({ chatId, visibility });
        await Promise.all([
          utils.chat.getMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
      }}
      loadCommunity={loadCommunity}
      updateCustomization={(input) =>
        updateCustomization.mutateAsync({ chatId, ...input })
      }
      uploadAvatar={async (file) => {
        const uploaded = await avatarUpload.uploadFile(file);
        if (!uploaded) throw new Error("Не удалось загрузить аватарку группы");
        return { mediaKey: uploaded.mediaKey, previewUrl: uploaded.previewUrl };
      }}
      setBoost={(enabled) => setBoost.mutateAsync({ chatId, enabled })}
      removeMember={(memberId) => removeMember.mutateAsync({ chatId, memberId })}
      changeMemberRole={(memberId, role) => setMemberRole.mutateAsync({ chatId, memberId, role })}
      transferOwnership={(targetUserId) => transferOwnership.mutateAsync({ chatId, targetUserId })}
      leaveGroup={() => leaveGroup.mutateAsync({ chatId })}
      deleteGroup={() => deleteGroup.mutateAsync({ chatId })}
      onGroupClosed={() => {
        void utils.chat.list.invalidate();
        router.replace("/messages");
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
