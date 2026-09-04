import { lazy, Suspense, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import type { DesktopConfig } from "./config";
import { DesktopAutoUpdater } from "./updates/DesktopAutoUpdater";
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
  const { clearPendingPath, pendingPath } = useDesktopDeepLink();
  useEffect(() => registerExternalLinkOpener((url) => invoke("open_external_url", { url })), []);
  return (
    <>
      <DesktopAutoUpdater />
      <AuthProvider config={config}>
        <DesktopSessionRouter
          config={config}
          pendingPath={pendingPath}
          onPendingPathConsumed={clearPendingPath}
        />
      </AuthProvider>
    </>
  );
}

function DesktopSessionRouter({
  config,
  pendingPath,
  onPendingPathConsumed,
}: {
  config: DesktopConfig;
  pendingPath: string | null;
  onPendingPathConsumed: () => void;
}) {
  const { bootstrapError, loading, retry, session } = useDesktopAuth();
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
  if (!session) return <DesktopLogin config={config} />;
  return (
    <Suspense fallback={<BrandedLoadingView fullscreen />}>
      <DesktopAuthenticatedApp
        config={config}
        session={session}
        initialPathname={pendingPath}
        onInitialPathConsumed={onPendingPathConsumed}
      />
    </Suspense>
  );
}
