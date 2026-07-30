import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { GroupInviteSheetView } from "@/components/chat/GroupInviteSheetView";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopGroupInviteSheet({
  chatId,
  config,
  session,
}: {
  chatId: string;
  config: DesktopConfig;
  session: Session;
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

  return (
    <GroupInviteSheetView
      inviteBaseUrl={config.apiUrl}
      createInvite={createInvite}
      revokeInvite={revokeInvite}
    />
  );
}
