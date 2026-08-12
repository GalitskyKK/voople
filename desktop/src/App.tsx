import { lazy, Suspense } from "react";

import { getDesktopConfig } from "./config";
import { DesktopTitleBar } from "./shell/DesktopTitleBar";

const DesktopConfiguredApp = lazy(() =>
  import("./DesktopConfiguredApp").then((module) => ({
    default: module.DesktopConfiguredApp,
  })),
);

export function App() {
  const config = getDesktopConfig();
  return (
    <div className="desktop-window-frame">
      <DesktopTitleBar />
      <div className="desktop-window-content">
        {config ? (
          <Suspense fallback={<main className="status-page">Открываем Voople…</main>}>
            <DesktopConfiguredApp config={config} />
          </Suspense>
        ) : (
          <DesktopSetup />
        )}
      </div>
    </div>
  );
}


function DesktopSetup() {
  return (
    <main className="status-page">
      <section className="setup-card">
        <p className="eyebrow">VOOPLE DESKTOP</p>
        <h1>Нужна публичная конфигурация</h1>
        <p>
          Скопируйте <code>.env.example</code> в <code>.env.local</code> внутри папки
          desktop и заполните три публичные переменные.
        </p>
      </section>
    </main>
  );
}
