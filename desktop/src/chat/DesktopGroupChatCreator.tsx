import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { GroupChatCreatorView } from "@/components/chat/GroupChatCreatorView";
import type { UserSearchHit } from "@/types/search";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopChatAvatar } from "./DesktopChatAvatar";

export function DesktopGroupChatCreator({
  config,
  session,
  onCreated,
}: {
  config: DesktopConfig;
  session: Session;
  onCreated: (chatId: string) => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const searchUsers = useCallback(
    async (query: string) =>
      (await client.query("chat.groupContacts", { q: query })) as UserSearchHit[],
    [client],
  );
  const createGroup = useCallback(
    async (input: { name: string; memberIds: string[] }) =>
      (await client.mutation("chat.createGroup", input)) as string,
    [client],
  );

  return (
    <GroupChatCreatorView
      compact
      currentUserId={session.user.id}
      searchUsers={searchUsers}
      createGroup={createGroup}
      onCreated={onCreated}
      renderAvatar={(user) => (
        <DesktopChatAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} />
      )}
    />
  );
}
