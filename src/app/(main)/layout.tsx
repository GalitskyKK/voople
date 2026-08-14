import { AuthGateProvider } from "@/components/auth/AuthGateProvider";
import { MainShell } from "@/components/layout/MainShell";
import { createClient } from "@/lib/supabase/server";
import { OnlinePresenceProvider } from "@/providers/OnlinePresenceProvider";
import { StreakPing } from "@/providers/StreakPing";
import { WebVoiceSessionProvider } from "@/components/chat/voice/WebVoiceSessionProvider";
import { WebLegalConsentBoundary } from "@/components/legal/WebLegalConsentBoundary";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
