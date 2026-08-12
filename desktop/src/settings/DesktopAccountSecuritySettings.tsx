import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import { AccountSecuritySettings } from "@/components/settings/AccountSecuritySettings";
import { AccountDataControls } from "@/components/settings/AccountDataControls";
import { downloadAccountExport } from "@/lib/account-export-client";
import {
  announcePresenceVisibility,
  shouldPublishPresence,
} from "@/lib/presence-privacy";

import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";
import { createDesktopTrpcClient } from "../api/trpc";

export function DesktopAccountSecuritySettings({
  config,
  session,
}: {
  config: DesktopConfig;
  session: Session;
}) {
  const supabase = getSupabase(config);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(() =>
    shouldPublishPresence(session.user.user_metadata),
  );

  return (
    <>
    <AccountSecuritySettings
      currentEmail={session.user.email ?? null}
      showOnlineStatus={showOnlineStatus}
      requestReauthentication={async () => {
        const { error } = await supabase.auth.reauthenticate();
        if (error) throw error;
      }}
      updateEmail={async (email, nonce) => {
        const { error } = await supabase.auth.updateUser(
          { email, nonce },
          { emailRedirectTo: new URL("/settings", config.apiUrl).toString() },
        );
        if (error) throw error;
      }}
      updatePassword={async (password, nonce) => {
        const { error } = await supabase.auth.updateUser({ password, nonce });
        if (error) throw error;
      }}
      updateOnlineStatus={async (enabled) => {
        const { data: current } = await supabase.auth.getUser();
        const { error } = await supabase.auth.updateUser({
          data: {
            ...(current.user?.user_metadata ?? {}),
            show_online_status: enabled,
          },
        });
        if (error) throw error;
        await client.mutation("user.setPresenceVisibility", { visible: enabled });
        setShowOnlineStatus(enabled);
        announcePresenceVisibility(enabled);
      }}
    />
    <AccountDataControls
      exportAccountData={() => downloadAccountExport(
        new URL("/api/account/export", config.apiUrl).toString(),
        session.access_token,
      )}
    />
    </>
  );
}
