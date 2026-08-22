import type { Session } from "@supabase/supabase-js";

import { AccountSecuritySettings } from "@/components/settings/AccountSecuritySettings";
import { AccountDataControls } from "@/components/settings/AccountDataControls";
import { downloadAccountExport } from "@/lib/account-export-client";
import { listTrustedDevices, revokeTrustedDevice } from "@/lib/auth/trusted-device-client";

import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

export function DesktopAccountSecuritySettings({
  config,
  session,
}: {
  config: DesktopConfig;
  session: Session;
}) {
  const supabase = getSupabase(config);
  return (
    <>
    <AccountSecuritySettings
      currentEmail={session.user.email ?? null}
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
      loadTrustedDevices={() => listTrustedDevices({ apiUrl: config.apiUrl, accessToken: session.access_token })}
      revokeTrustedDevice={(deviceRecordId) => revokeTrustedDevice({ apiUrl: config.apiUrl, accessToken: session.access_token, deviceRecordId })}
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
