import type { Session } from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";

import { VoiceSessionProvider } from "@/components/chat/voice/VoiceSessionProvider";
import { LegalConsentGate } from "@/components/legal/LegalConsentGate";
import type { SubscribeToVoiceRooms } from "@/components/chat/voice/useIncomingVoiceCalls";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import type { IncomingCallView } from "@/types/chat";

import { DesktopTRPCProvider } from "./api/DesktopTRPCProvider";
import { getSupabase } from "./auth/supabase";
import type { DesktopConfig } from "./config";
import {
  notifyIncomingCall,
  prepareDesktopNotifications,
} from "./notifications/incoming-call";
import { DesktopPresenceProvider } from "./providers/DesktopPresenceProvider";
import { DesktopShell } from "./shell/DesktopShell";
import { DesktopReleaseNotesDialog } from "./updates/DesktopReleaseNotesDialog";

export function DesktopAuthenticatedApp({
  config,
  initialPathname,
  onInitialPathConsumed,
  session,
}: {
  config: DesktopConfig;
  initialPathname: string | null;
  onInitialPathConsumed: () => void;
  session: Session;
}) {
  const { preferences } = useAppPreferences();

  useEffect(() => {
    if (!preferences.notifyCalls) return;
    void prepareDesktopNotifications();
  }, [preferences.notifyCalls]);

  const handleIncomingCall = useCallback(
    (call: IncomingCallView) => {
      if (!preferences.notifyCalls) return;
      void getCurrentWindow()
        .isFocused()
        .then((focused) => {
          if (!focused) {
            return notifyIncomingCall(call, preferences.notificationSound);
          }
        })
        .catch(() => notifyIncomingCall(call, preferences.notificationSound));
    },
    [preferences.notificationSound, preferences.notifyCalls],
  );

  const subscribeToVoiceRooms = useCallback<SubscribeToVoiceRooms>(
    (onChange) => {
      const realtimeClient = getSupabase(config);
      const channel = realtimeClient.channel(`voice-calls:${crypto.randomUUID()}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_rooms" },
          onChange,
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onChange();
        });
      return () => {
        void realtimeClient.removeChannel(channel);
      };
    },
    [config],
  );

  return (
    <DesktopTRPCProvider config={config} session={session}>
      <LegalConsentGate
        documentBaseUrl={config.apiUrl}
        source="desktop_reconsent"
        onSignOut={async () => {
          await getSupabase(config).auth.signOut();
        }}
      >
        <DesktopReleaseNotesDialog />
        <VoiceSessionProvider
          onIncomingCall={handleIncomingCall}
          subscribeToVoiceRooms={subscribeToVoiceRooms}
        >
          <DesktopPresenceProvider config={config} session={session}>
            <DesktopShell
              config={config}
              session={session}
              initialPathname={initialPathname}
              onInitialPathConsumed={onInitialPathConsumed}
            />
          </DesktopPresenceProvider>
        </VoiceSessionProvider>
      </LegalConsentGate>
    </DesktopTRPCProvider>
  );
}
