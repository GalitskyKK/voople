import { lazy, Suspense } from "react";

import { AuthProvider, useDesktopAuth } from "./auth/AuthProvider";
import { DesktopLogin } from "./auth/DesktopLogin";
import type { DesktopConfig } from "./config";

const DesktopAuthenticatedApp = lazy(() =>
  import("./DesktopAuthenticatedApp").then((module) => ({
    default: module.DesktopAuthenticatedApp,
  })),
);

export function DesktopConfiguredApp({ config }: { config: DesktopConfig }) {
  return (
    <AuthProvider config={config}>
      <DesktopSessionRouter config={config} />
    </AuthProvider>
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
