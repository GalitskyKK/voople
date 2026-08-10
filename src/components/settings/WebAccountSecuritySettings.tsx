"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  announcePresenceVisibility,
  shouldPublishPresence,
} from "@/lib/presence-privacy";
import { trpc } from "@/lib/trpc/client";

import { AccountSecuritySettings } from "./AccountSecuritySettings";

export function WebAccountSecuritySettings() {
  const supabase = useMemo(() => createClient(), []);
  const setPresenceVisibility = trpc.user.setPresenceVisibility.useMutation();
  const [email, setEmail] = useState<string | null>(null);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setShowOnlineStatus(shouldPublishPresence(data.user?.user_metadata));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <AccountSecuritySettings
      currentEmail={email}
      showOnlineStatus={showOnlineStatus}
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
      updateOnlineStatus={async (enabled) => {
        const { data: current } = await supabase.auth.getUser();
        const { error } = await supabase.auth.updateUser({
          data: {
            ...(current.user?.user_metadata ?? {}),
            show_online_status: enabled,
          },
        });
        if (error) throw error;
        await setPresenceVisibility.mutateAsync({ visible: enabled });
        setShowOnlineStatus(enabled);
        announcePresenceVisibility(enabled);
      }}
    />
  );
}
