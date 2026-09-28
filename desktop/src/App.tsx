import { lazy, Suspense, useState } from "react";

import { getDesktopConfig } from "./config";
import { DesktopTitleBar } from "./shell/DesktopTitleBar";
import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { GroupTopChromeSlotContext } from "@/components/chat/GroupTopChromeSlotContext";

const DesktopConfiguredApp = lazy(() =>
  import("./DesktopConfiguredApp").then((module) => ({
    default: module.DesktopConfiguredApp,
  })),
);

export function App() {
  const config = getDesktopConfig();
  const [groupChromeSlot, setGroupChromeSlot] = useState<HTMLElement | null>(null);
  return (
    <GroupTopChromeSlotContext.Provider value={groupChromeSlot}>
      <div className="desktop-window-frame">
        <DesktopTitleBar onGroupChromeSlotChange={setGroupChromeSlot} />
        <div className="desktop-window-content">
          {config ? (
            <Suspense fallback={<BrandedLoadingView fullscreen />}>
              <DesktopConfiguredApp config={config} />
            </Suspense>
          ) : (
            <DesktopSetup />
          )}
          <div id="voople-desktop-overlay-root" className="desktop-overlay-root" />
        </div>
      </div>
    </GroupTopChromeSlotContext.Provider>
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
