import { lazy, Suspense, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import type { DesktopConfig } from "./config";
import { DesktopAutoUpdater } from "./updates/DesktopAutoUpdater";
import { DESKTOP_UPDATE_REQUIRED_EVENT } from "./api/desktop-request";
import { DESKTOP_UPDATE_CHECK_EVENT } from "./updates/events";
import { registerExternalLinkOpener } from "@/lib/platform/external-links";
import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { SessionBootstrapRecoveryView } from "@/components/auth/SessionBootstrapRecoveryView";
import { useDesktopDeepLink } from "./navigation/useDesktopDeepLink";

const DesktopAuthenticatedApp = lazy(() =>
  import("./DesktopAuthenticatedApp").then((module) => ({
    default: module.DesktopAuthenticatedApp,
  })),
);

export function DesktopConfiguredApp({ config }: { config: DesktopConfig }) {
  const { clearPendingPath, pendingPath, preservePendingPath } = useDesktopDeepLink();
  const [updateRequired, setUpdateRequired] = useState(false);
  useEffect(() => registerExternalLinkOpener((url) => invoke("open_external_url", { url })), []);
  useEffect(() => {
    const onUpdateRequired = () => setUpdateRequired(true);
    window.addEventListener(DESKTOP_UPDATE_REQUIRED_EVENT, onUpdateRequired);
    return () => window.removeEventListener(DESKTOP_UPDATE_REQUIRED_EVENT, onUpdateRequired);
  }, []);
  return (
    <>
      <DesktopAutoUpdater />
      {updateRequired ? (
        <main className="fixed inset-0 z-[90] grid place-items-center bg-[var(--app-surface)] p-5">
          <section className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-6 text-center" role="alert">
            <h1 className="text-xl font-semibold">Требуется обновление Voople</h1>
            <p className="mt-3 text-sm text-[var(--app-muted)]">Установите подписанное обновление, чтобы продолжить работу.</p>
            <button className="mt-5 rounded-xl bg-[var(--theme-accent)] px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2" type="button" onClick={() => window.dispatchEvent(new Event(DESKTOP_UPDATE_CHECK_EVENT))}>
              Проверить обновления
            </button>
          </section>
        </main>
      ) : null}
      <AuthProvider config={config}>
        <DesktopSessionRouter
          config={config}
          pendingPath={pendingPath}
          onPendingPathConsumed={clearPendingPath}
          onPendingPathPreserved={preservePendingPath}
        />
      </AuthProvider>
    </>
  );
}

function DesktopSessionRouter({
  config,
  pendingPath,
  onPendingPathConsumed,
  onPendingPathPreserved,
}: {
  config: DesktopConfig;
  pendingPath: string | null;
  onPendingPathConsumed: () => void;
  onPendingPathPreserved: (path: string) => void;
}) {
  const { bootstrapError, deviceTrustPending, loading, retry, session } = useDesktopAuth();
  if (loading) return <BrandedLoadingView fullscreen />;
  if (bootstrapError) {
    return (
      <SessionBootstrapRecoveryView
        reason={bootstrapError}
        pending={false}
        onRetry={retry}
        withinDesktopFrame
      />
    );
  }
  if (!session || deviceTrustPending) return <DesktopLogin config={config} continuationPath={pendingPath} />;
  return (
    <Suspense fallback={<BrandedLoadingView fullscreen />}>
      <DesktopAuthenticatedApp
        config={config}
        session={session}
        initialPathname={pendingPath}
        onInitialPathConsumed={onPendingPathConsumed}
        onPendingPathPreserved={onPendingPathPreserved}
      />
    </Suspense>
  );
}
