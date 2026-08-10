import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { GroupManagementSheetView } from "@/components/chat/GroupManagementSheetView";
import type { ChatGroupMemberView, GroupCommunityView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";
import { uploadPresignedFile } from "@/lib/uploads/presigned-upload";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopChatAvatar } from "./DesktopChatAvatar";

export function DesktopGroupInviteSheet({
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
  config,
  session,
  onMembersChanged,
  onGroupClosed,
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
  config: DesktopConfig;
  session: Session;
  onMembersChanged: () => void;
  onGroupClosed: () => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const createInvite = useCallback(
    async () =>
      (await client.mutation("chat.createInvite", { chatId })) as {
        token: string;
      },
    [chatId, client],
  );
  const revokeInvite = useCallback(
    (token: string) =>
      client.mutation("chat.revokeInvite", { chatId, token }),
    [chatId, client],
  );
  const loadMembers = useCallback(
    async () =>
      (await client.query("chat.groupMembers", { chatId })) as ChatGroupMemberView[],
    [chatId, client],
  );
  const searchContacts = useCallback(
    async (q: string) =>
      (await client.query("chat.groupContacts", { chatId, q })) as UserSearchHit[],
    [chatId, client],
  );
  const addMembers = useCallback(
    (memberIds: string[]) =>
      client.mutation("chat.addGroupMembers", { chatId, memberIds }),
    [chatId, client],
  );
  const loadCommunity = useCallback(
    () =>
      client.query("chat.groupCommunity", {
        chatId,
      }) as Promise<GroupCommunityView>,
    [chatId, client],
  );
  const uploadAvatar = useCallback(
    async (file: File) => {
      const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
        throw new Error("Допустимы JPEG, PNG, WebP или GIF");
      }
      if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("Аватарка должна быть не больше 5 МБ");
      }
      const presigned = (await client.mutation("upload.createPresigned", {
        purpose: "group-avatar",
        contentType,
        sizeBytes: file.size,
      })) as { key?: string; uploadUrl?: string; publicUrl?: string | null };
      if (!presigned.key || !presigned.uploadUrl || !presigned.publicUrl) {
        throw new Error("Сервер не подготовил загрузку");
      }
      await uploadPresignedFile({ url: presigned.uploadUrl, file, contentType });
      return { mediaKey: presigned.key, previewUrl: presigned.publicUrl };
    },
    [client],
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
      inviteBaseUrl={config.apiUrl}
      loadMembers={loadMembers}
      searchContacts={searchContacts}
      addMembers={addMembers}
      createInvite={createInvite}
      revokeInvite={revokeInvite}
      updateTopics={async (enabled, layout) => {
        await client.mutation("chat.setGroupTopics", {
          chatId,
          enabled,
          layout,
        });
        onMembersChanged();
      }}
      updateVisibility={async (visibility) => {
        await client.mutation("chat.setGroupVisibility", { chatId, visibility });
        onMembersChanged();
      }}
      loadCommunity={loadCommunity}
      updateCustomization={(input) =>
        client.mutation("chat.updateGroupCustomization", {
          chatId,
          ...input,
        }) as Promise<GroupCommunityView>
      }
      uploadAvatar={uploadAvatar}
      setBoost={(enabled) =>
        client.mutation("chat.setGroupBoost", {
          chatId,
          enabled,
        }) as Promise<GroupCommunityView>
      }
      removeMember={(memberId) =>
        client.mutation("chat.removeGroupMember", { chatId, memberId })
      }
      leaveGroup={() => client.mutation("chat.leaveGroup", { chatId })}
      deleteGroup={() => client.mutation("chat.deleteGroup", { chatId })}
      onGroupClosed={onGroupClosed}
      onMembersChanged={onMembersChanged}
      renderAvatar={(user) => (
        <DesktopChatAvatar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
        />
      )}
    />
  );
}
