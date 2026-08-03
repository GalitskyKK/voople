import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { GroupManagementSheetView } from "@/components/chat/GroupManagementSheetView";
import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopChatAvatar } from "./DesktopChatAvatar";

export function DesktopGroupInviteSheet({
  chatId,
  chatName,
  viewerRole,
  canManage,
  topicsEnabled,
  topicsLayout,
  config,
  session,
  onMembersChanged,
  onGroupClosed,
}: {
  chatId: string;
  chatName: string;
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
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

  return (
    <GroupManagementSheetView
      chatName={chatName}
      viewerRole={viewerRole}
      canManage={canManage}
      topicsEnabled={topicsEnabled}
      topicsLayout={topicsLayout}
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
