import { lazy, Suspense, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import type { DesktopConfig } from "./config";
import { DesktopAutoUpdater } from "./updates/DesktopAutoUpdater";
import { DesktopReleaseNotesDialog } from "./updates/DesktopReleaseNotesDialog";
import { registerExternalLinkOpener } from "@/lib/platform/external-links";

const DesktopAuthenticatedApp = lazy(() =>
  import("./DesktopAuthenticatedApp").then((module) => ({
    default: module.DesktopAuthenticatedApp,
  })),
);

export function DesktopConfiguredApp({ config }: { config: DesktopConfig }) {
  useEffect(() => registerExternalLinkOpener((url) => invoke("open_external_url", { url })), []);
  return (
    <>
      <DesktopAutoUpdater />
      <DesktopReleaseNotesDialog />
      <AuthProvider config={config}>
        <DesktopSessionRouter config={config} />
      </AuthProvider>
    </>
  );
}

function DesktopSessionRouter({ config }: { config: DesktopConfig }) {
  const { loading, session } = useDesktopAuth();
  if (loading) return <main className="status-page">Восстанавливаем сессию…</main>;
  if (!session) return <DesktopLogin config={config} />;
  return (
    <Suspense fallback={<main className="status-page">Открываем Voople…</main>}>
      <DesktopAuthenticatedApp config={config} session={session} />
    </Suspense>
  );
}
