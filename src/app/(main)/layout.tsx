import { MainShell } from "@/components/layout/MainShell";
import { OnlinePresenceProvider } from "@/providers/OnlinePresenceProvider";
import { StreakPing } from "@/providers/StreakPing";
import { WebVoiceSessionProvider } from "@/components/chat/voice/WebVoiceSessionProvider";
import { WebLegalConsentBoundary } from "@/components/legal/WebLegalConsentBoundary";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <WebLegalConsentBoundary>
      <OnlinePresenceProvider>
        <StreakPing />
        <WebVoiceSessionProvider>
          <MainShell>{children}</MainShell>
        </WebVoiceSessionProvider>
      </OnlinePresenceProvider>
    </WebLegalConsentBoundary>
  );
}
