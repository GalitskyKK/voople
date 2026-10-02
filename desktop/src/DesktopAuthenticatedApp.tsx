import type { Session } from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";

import { VoiceSessionProvider } from "@/components/chat/voice/VoiceSessionProvider";
import { LegalConsentGate } from "@/components/legal/LegalConsentGate";
import type { SubscribeToVoiceRooms } from "@/components/chat/voice/useIncomingVoiceCalls";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { stopProductSoundLoop } from "@/lib/sound/sound-playback";
import type { IncomingCallView } from "@/types/chat";

import { DesktopTRPCProvider } from "./api/DesktopTRPCProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";
import { getSupabase } from "./auth/supabase";
import type { DesktopConfig } from "./config";
import {
  notifyIncomingCall,
  prepareDesktopNotifications,
} from "./notifications/incoming-call";
import { notificationAudioPolicy } from "./notifications/audio-policy";
import { DesktopPresenceProvider } from "./providers/DesktopPresenceProvider";
import { DesktopChatsProvider } from "./chat/useDesktopChats";
import { DesktopShell } from "./shell/DesktopShell";
import { DesktopReleaseNotesDialog } from "./updates/DesktopReleaseNotesDialog";

export function DesktopAuthenticatedApp({
  config,
  initialPathname,
  onInitialPathConsumed,
  onPendingPathPreserved,
  session,
}: {
  config: DesktopConfig;
  initialPathname: string | null;
  onInitialPathConsumed: () => void;
  onPendingPathPreserved: (path: string) => void;
  session: Session;
}) {
  const { preferences } = useAppPreferences();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let active = true;
    let disposeFocus: (() => void) | undefined;
    void appWindow.isFocused().then((value) => { if (active) setFocused(value); }).catch(() => undefined);
    void appWindow.onFocusChanged(({ payload }) => { if (active) setFocused(payload); })
      .then((dispose) => { if (active) disposeFocus = dispose; else dispose(); })
      .catch(() => undefined);
    const onVisibilityChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { active = false; disposeFocus?.(); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, []);

  const customIncomingSound = Boolean(notificationAudioPolicy({
    enabled: preferences.notificationSound, focused, visible, sound: "call.incoming",
  }).customSound);

  useEffect(() => {
    if (!preferences.notifyCalls) return;
    void prepareDesktopNotifications();
  }, [preferences.notifyCalls]);

  const handleIncomingCall = useCallback(
    (call: IncomingCallView) => {
      if (!preferences.notifyCalls) return;
      void getCurrentWindow()
        .isFocused()
        .then((isFocused) => {
          const policy = notificationAudioPolicy({
            enabled: preferences.notificationSound,
            focused: isFocused,
            visible: document.visibilityState === "visible",
            sound: "call.incoming",
          });
          if (!isFocused || document.visibilityState !== "visible") {
            stopProductSoundLoop("call.incoming");
            if (!isFocused) setFocused(false);
            return notifyIncomingCall(call, policy.nativeSound);
          }
        })
        .catch(() => notifyIncomingCall(call, preferences.notificationSound && !customIncomingSound));
    },
    [customIncomingSound, preferences.notificationSound, preferences.notifyCalls],
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "direct_call_signals" },
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
    <DesktopTRPCProvider key={session.user.id} config={config} session={session}>
      <AppThemeSync key={session.user.id} />
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
          allowCustomIncomingSound={customIncomingSound}
          subscribeToVoiceRooms={subscribeToVoiceRooms}
        >
          <DesktopPresenceProvider config={config} session={session}>
            <DesktopChatsProvider config={config} session={session}>
              <DesktopShell
                config={config}
                session={session}
                initialPathname={initialPathname}
                onInitialPathConsumed={onInitialPathConsumed}
                onPendingPathPreserved={onPendingPathPreserved}
              />
            </DesktopChatsProvider>
          </DesktopPresenceProvider>
        </VoiceSessionProvider>
      </LegalConsentGate>
    </DesktopTRPCProvider>
  );
}
