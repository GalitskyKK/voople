import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { SubchatCreatorView } from "@/components/chat/SubchatCreatorView";
import type { ChatGroupMemberView } from "@/types/chat";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopSubchatCreator({
  parentChatId,
  config,
  session,
  onCreated,
  viewerRole,
}: {
  parentChatId: string;
  config: DesktopConfig;
  session: Session;
  onCreated: (chatId: string) => void;
  viewerRole: "owner" | "admin" | "member";
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const createSubchat = useCallback(
    async (
      name: string,
      icon: string | null,
      accessMode: "inherit" | "restricted",
      memberIds: string[],
    ) =>
      (await client.mutation("chat.createSubchat", {
        parentChatId,
        name,
        icon,
        accessMode,
        memberIds,
      })) as string,
    [client, parentChatId],
  );

  return (
    <SubchatCreatorView
      createSubchat={createSubchat}
      onCreated={onCreated}
      canRestrict={viewerRole === "owner" || viewerRole === "admin"}
      loadMembers={async () =>
        (await client.query("chat.groupMembers", {
          chatId: parentChatId,
        })) as ChatGroupMemberView[]
      }
    />
  );
}
