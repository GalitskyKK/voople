import { AuthGateProvider } from "@/components/auth/AuthGateProvider";
import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery";
import { MainShell } from "@/components/layout/MainShell";
import { createClient } from "@/lib/supabase/server";
import { OnlinePresenceProvider } from "@/providers/OnlinePresenceProvider";
import { StreakPing } from "@/providers/StreakPing";
import { WebVoiceSessionProvider } from "@/components/chat/voice/WebVoiceSessionProvider";
import { WebLegalConsentBoundary } from "@/components/legal/WebLegalConsentBoundary";
import { resolveAuthSessionBootstrap } from "@/lib/supabase/session-bootstrap";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const bootstrap = await resolveAuthSessionBootstrap(async () => {
    const { data, error } = await supabase.auth.getUser();
    return { value: data.user, error };
  });

  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />;
  }

  const user = bootstrap.value;
  const authenticated = Boolean(user);

  if (!authenticated) {
    return (
      <AuthGateProvider authenticated={false}>
        <MainShell authenticated={false}>{children}</MainShell>
      </AuthGateProvider>
    );
  }

  return (
    <AuthGateProvider authenticated>
      <WebLegalConsentBoundary>
        <OnlinePresenceProvider>
          <StreakPing />
          <WebVoiceSessionProvider>
            <MainShell authenticated>{children}</MainShell>
          </WebVoiceSessionProvider>
        </OnlinePresenceProvider>
      </WebLegalConsentBoundary>
    </AuthGateProvider>
  );
}
