import { MainShell } from "@/components/layout/MainShell";
import { OnlinePresenceProvider } from "@/providers/OnlinePresenceProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnlinePresenceProvider>
      <MainShell>{children}</MainShell>
    </OnlinePresenceProvider>
  );
}
