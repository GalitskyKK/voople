"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { downloadAccountExport } from "@/lib/account-export-client";
import { listTrustedDevices, revokeTrustedDevice } from "@/lib/auth/trusted-device-client";

import { AccountSecuritySettings } from "./AccountSecuritySettings";
import { AccountDataControls } from "./AccountDataControls";

export function WebAccountSecuritySettings() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <>
    <AccountSecuritySettings
      currentEmail={email}
      requestReauthentication={async () => {
        const { error } = await supabase.auth.reauthenticate();
        if (error) throw error;
      }}
      updateEmail={async (nextEmail, nonce) => {
        const { error } = await supabase.auth.updateUser(
          { email: nextEmail, nonce },
          { emailRedirectTo: `${window.location.origin}/settings` },
        );
        if (error) throw error;
      }}
      updatePassword={async (password, nonce) => {
        const { error } = await supabase.auth.updateUser({ password, nonce });
        if (error) throw error;
      }}
      loadTrustedDevices={async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return [];
        return listTrustedDevices({ accessToken: data.session.access_token });
      }}
      revokeTrustedDevice={async (deviceRecordId) => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Сессия завершена");
        await revokeTrustedDevice({ accessToken: data.session.access_token, deviceRecordId });
      }}
    />
    <AccountDataControls exportAccountData={() => downloadAccountExport("/api/account/export")} />
    </>
  );
}
