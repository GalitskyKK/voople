import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { SectionAccessSheetView } from "@/components/chat/SectionAccessSheetView";
import type { ChatGroupMemberView } from "@/types/chat";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

/** Desktop transport adapter; all portable presentation lives in SectionAccessSheetView. */
export function DesktopSectionAccessAdapter({
  chatId,
  parentChatId,
  config,
  session,
  onChanged,
}: {
  chatId: string;
  parentChatId: string;
  config: DesktopConfig;
  session: Session;
  onChanged: () => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const loadAccess = useCallback(
    () =>
      client.query("chat.sectionAccess", { chatId }) as Promise<{
        accessMode: "inherit" | "restricted";
        selectedMemberIds: string[];
      }>,
    [chatId, client],
  );
  const loadMembers = useCallback(
    () =>
      client.query("chat.groupMembers", {
        chatId: parentChatId,
      }) as Promise<ChatGroupMemberView[]>,
    [client, parentChatId],
  );

  return (
    <SectionAccessSheetView
      loadAccess={loadAccess}
      loadMembers={loadMembers}
      saveAccess={(accessMode, memberIds) =>
        client.mutation("chat.setSectionAccess", {
          chatId,
          accessMode,
          memberIds,
        })
      }
      onChanged={onChanged}
    />
  );
}
