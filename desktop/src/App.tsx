import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect } from "react";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import { getSupabase } from "./auth/supabase";
import { DesktopTRPCProvider } from "./api/DesktopTRPCProvider";
import { getDesktopConfig, type DesktopConfig } from "./config";
import { DesktopShell } from "./shell/DesktopShell";
import { VoiceSessionProvider } from "@/components/chat/voice/VoiceSessionProvider";
import type { SubscribeToVoiceRooms } from "@/components/chat/voice/useIncomingVoiceCalls";
import type { IncomingCallView } from "@/types/chat";
import { setPublicAssetBaseUrl } from "@/lib/object-storage";
import {
  notifyIncomingCall,
  prepareDesktopNotifications,
} from "./notifications/incoming-call";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { DesktopTitleBar } from "./shell/DesktopTitleBar";

export function App() {
  const config = getDesktopConfig();
  if (config) setPublicAssetBaseUrl(config.assetsCdnUrl);
  return (
    <div className="desktop-window-frame">
      <DesktopTitleBar />
      <div className="desktop-window-content">
        {config ? (
          <AuthProvider config={config}><DesktopRouter config={config} /></AuthProvider>
        ) : (
          <DesktopSetup />
        )}
      </div>
    </div>
  );
}


function DesktopRouter({ config }: { config: DesktopConfig }) {
  const { loading, session } = useDesktopAuth();
  const { preferences } = useAppPreferences();
  useEffect(() => {
    if (!session || !preferences.notifyCalls) return;
    void prepareDesktopNotifications();
  }, [preferences.notifyCalls, session]);
  const handleIncomingCall = useCallback(
    (call: IncomingCallView) => {
      if (preferences.notifyCalls) void notifyIncomingCall(call);
      void invoke<void>("show_main_window").catch(() => undefined);
    },
    [preferences.notifyCalls],
  );
  const subscribeToVoiceRooms = useCallback<SubscribeToVoiceRooms>(
    (onChange) => {
      const realtimeClient = getSupabase(config);
      const channel = realtimeClient.channel(`voice-calls:${crypto.randomUUID()}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_rooms",
          },
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
  if (loading) return <main className="status-page">Восстанавливаем сессию…</main>;
  if (!session) return <DesktopLogin config={config} />;
  return (
    <DesktopTRPCProvider config={config} session={session}>
      <VoiceSessionProvider
        onIncomingCall={handleIncomingCall}
        subscribeToVoiceRooms={subscribeToVoiceRooms}
      >
        <DesktopShell config={config} session={session} />
      </VoiceSessionProvider>
    </DesktopTRPCProvider>
  );
}

function DesktopSetup() {
  return (
    <main className="status-page">
      <section className="setup-card">
        <p className="eyebrow">VOOPLE DESKTOP</p>
        <h1>Нужна публичная конфигурация</h1>
        <p>
          Скопируйте <code>.env.example</code> в <code>.env.local</code> внутри папки
          desktop и заполните три публичные переменные.
        </p>
      </section>
    </main>
  );
}
