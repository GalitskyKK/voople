"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { trpc } from "@/lib/trpc/client";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";
import type { GroupJoinPolicy, GroupVisibility } from "@/types/chat";

import { GroupManagementSheetView } from "./GroupManagementSheetView";

export function GroupInviteSheet({
  chatId,
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupAccentColor,
  groupTag,
  triggerVariant = "toolbar",
  viewerRole,
  canManage,
  topicsEnabled,
  topicsLayout,
  groupVisibility,
  joinPolicy,
  presentation = "sheet",
}: {
  chatId: string;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  triggerVariant?: "toolbar" | "identity";
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  groupVisibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  presentation?: "sheet" | "page";
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createInvite = trpc.chat.createInvite.useMutation();
  const revokeInvite = trpc.chat.revokeInvite.useMutation();
  const addMembers = trpc.chat.addGroupMembers.useMutation();
  const setTopics = trpc.chat.setGroupTopics.useMutation();
  const setVisibility = trpc.chat.setGroupVisibility.useMutation();
  const resolveJoinRequestMutation = trpc.chat.resolveGroupJoinRequest.useMutation();
  const setDiscoveryProfile = trpc.social.setGroupDiscoveryProfile.useMutation();
  const setGroupName = trpc.chat.setGroupName.useMutation();
  const updateCustomization = trpc.chat.updateGroupCustomization.useMutation();
  const setBoost = trpc.chat.setGroupBoost.useMutation();
  const setPerk = trpc.chat.setGroupPerk.useMutation();
  const createEmoji = trpc.chat.createGroupEmoji.useMutation();
  const deleteEmoji = trpc.chat.deleteGroupEmoji.useMutation();
  const createSound = trpc.chat.createGroupSound.useMutation();
  const deleteSound = trpc.chat.deleteGroupSound.useMutation();
  const presignSound = trpc.upload.createPresigned.useMutation();
  const removeMember = trpc.chat.removeGroupMember.useMutation();
  const setMemberRole = trpc.chat.setGroupMemberRole.useMutation();
  const transferOwnership = trpc.chat.transferGroupOwnership.useMutation();
  const leaveGroup = trpc.chat.leaveGroup.useMutation();
  const deleteGroup = trpc.chat.deleteGroup.useMutation();
  const avatarUpload = useMediaUpload("group-avatar");
  const bannerUpload = useMediaUpload("banner");
  const emojiUpload = useMediaUpload("group-emoji");
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
  const loadEmojis = useCallback(
    () => utils.client.chat.groupEmojis.query({ chatId }),
    [chatId, utils.client],
  );
  const loadSounds = useCallback(
    () => utils.client.chat.groupSounds.query({ chatId }),
    [chatId, utils.client],
  );
  const loadJoinRequests = useCallback(
    () => utils.client.chat.groupJoinRequests.query({ chatId }),
    [chatId, utils.client],
  );
  const loadInterestCatalog = useCallback(
    () => utils.client.social.interestCatalog.query(),
    [utils.client],
  );
  const loadDiscoveryProfile = useCallback(
    () => utils.client.social.groupDiscoveryProfile.query({ chatId }),
    [chatId, utils.client],
  );
  const searchContacts = useCallback(
    (q: string) => utils.client.chat.groupContacts.query({ chatId, q }),
    [chatId, utils.client],
  );

  return (
    <GroupManagementSheetView
      chatId={chatId}
      chatName={chatName}
      memberCount={memberCount}
      groupIcon={groupIcon}
      groupAvatarUrl={groupAvatarUrl}
      groupAccentColor={groupAccentColor}
      groupTag={groupTag}
      triggerVariant={triggerVariant}
      viewerRole={viewerRole}
      canManage={canManage}
      topicsEnabled={topicsEnabled}
      topicsLayout={topicsLayout}
      groupVisibility={groupVisibility}
      joinPolicy={joinPolicy}
      presentation={presentation}
      onBack={() => router.push(`/messages/${chatId}`)}
      loadMembers={loadMembers}
      loadAudit={loadAudit}
      searchContacts={searchContacts}
      addMembers={(memberIds) => addMembers.mutateAsync({ chatId, memberIds })}
      createInvite={() => createInvite.mutateAsync({ chatId })}
      revokeInvite={(token) => revokeInvite.mutateAsync({ chatId, token })}
      updateTopics={async (enabled, layout) => {
        await setTopics.mutateAsync({ chatId, enabled, layout });
        await Promise.all([
          utils.chat.observeMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
      }}
      updateVisibility={async (visibility, nextJoinPolicy) => {
        await setVisibility.mutateAsync({ chatId, visibility, joinPolicy: nextJoinPolicy });
        await Promise.all([
          utils.chat.observeMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
      }}
      loadJoinRequests={loadJoinRequests}
      resolveJoinRequest={async (requestId, approve) => {
        const result = await resolveJoinRequestMutation.mutateAsync({ requestId, approve });
        await Promise.all([
          utils.chat.groupJoinRequests.invalidate({ chatId }),
          utils.chat.observeMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
        return result;
      }}
      loadInterestCatalog={loadInterestCatalog}
      loadDiscoveryProfile={loadDiscoveryProfile}
      updateDiscoveryProfile={(value) => setDiscoveryProfile.mutateAsync({ chatId, ...value })}
      updateName={async (name) => {
        const result = await setGroupName.mutateAsync({ chatId, name });
        await Promise.all([
          utils.chat.observeMessages.invalidate({ chatId }),
          utils.chat.list.invalidate(),
        ]);
        return result;
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
      uploadBanner={async (file) => {
        const uploaded = await bannerUpload.uploadFile(file);
        if (!uploaded) throw new Error("Не удалось загрузить баннер группы");
        return { mediaKey: uploaded.mediaKey, previewUrl: uploaded.previewUrl };
      }}
      setBoost={(enabled, slot, idempotencyKey) => setBoost.mutateAsync({ chatId, enabled, slot, idempotencyKey })}
      setPerk={(perkId, enabled) => setPerk.mutateAsync({ chatId, perkId: perkId as "animated_icon" | "emoji_sound" | "animated_banner" | "uploads" | "vanity" | "roles" | "hd", enabled })}
      loadEmojis={loadEmojis}
      createEmoji={(input) => createEmoji.mutateAsync({ chatId, ...input })}
      deleteEmoji={(emojiId) => deleteEmoji.mutateAsync({ emojiId })}
      uploadEmoji={async (file) => {
        const uploaded = await emojiUpload.uploadFile(file);
        if (!uploaded) throw new Error(emojiUpload.error ?? "Не удалось загрузить эмодзи");
        return { mediaKey: uploaded.mediaKey };
      }}
      loadSounds={loadSounds}
      createSound={(input) => createSound.mutateAsync({ chatId, ...input })}
      deleteSound={(soundId) => deleteSound.mutateAsync({ soundId })}
      uploadSound={async (file) => {
        const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
        if (file.size <= 0 || file.size > 1024 * 1024) throw new Error("Звук должен быть не больше 1 МБ");
        const signed = await presignSound.mutateAsync({ purpose: "group-sound", contentType, sizeBytes: file.size });
        await uploadPresignedFile({ url: signed.uploadUrl, file, contentType });
        return { mediaKey: signed.key };
      }}
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
        void utils.chat.observeMessages.invalidate({ chatId });
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
