import { MainShell } from "@/components/layout/MainShell";
import { OnlinePresenceProvider } from "@/providers/OnlinePresenceProvider";
import { StreakPing } from "@/providers/StreakPing";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnlinePresenceProvider>
      <StreakPing />
      <MainShell>{children}</MainShell>
    </OnlinePresenceProvider>
  );
}
