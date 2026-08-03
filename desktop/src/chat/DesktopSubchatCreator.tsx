import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { SubchatCreatorView } from "@/components/chat/SubchatCreatorView";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopSubchatCreator({
  parentChatId,
  config,
  session,
  onCreated,
}: {
  parentChatId: string;
  config: DesktopConfig;
  session: Session;
  onCreated: (chatId: string) => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const createSubchat = useCallback(
    async (name: string, icon: string | null) =>
      (await client.mutation("chat.createSubchat", {
        parentChatId,
        name,
        icon,
      })) as string,
    [client, parentChatId],
  );

  return (
    <SubchatCreatorView createSubchat={createSubchat} onCreated={onCreated} />
  );
}
