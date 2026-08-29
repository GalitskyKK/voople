import { lazy, Suspense, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import type { DesktopConfig } from "./config";
import { DesktopAutoUpdater } from "./updates/DesktopAutoUpdater";
import { registerExternalLinkOpener } from "@/lib/platform/external-links";
import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { SessionBootstrapRecoveryView } from "@/components/auth/SessionBootstrapRecoveryView";

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
      <AuthProvider config={config}>
        <DesktopSessionRouter config={config} />
      </AuthProvider>
    </>
  );
}

function DesktopSessionRouter({ config }: { config: DesktopConfig }) {
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
      <DesktopAuthenticatedApp config={config} session={session} />
    </Suspense>
  );
}
