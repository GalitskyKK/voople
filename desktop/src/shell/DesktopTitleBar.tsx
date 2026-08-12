import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import { VoopleMark } from "@/components/brand/VoopleMark";

function runWindowAction(action: "minimize" | "maximize" | "close") {
  if (!("__TAURI_INTERNALS__" in window)) return;
  const appWindow = getCurrentWindow();
  if (action === "minimize") return appWindow.minimize();
  if (action === "maximize") return appWindow.toggleMaximize();
  return appWindow.close();
}

export function DesktopTitleBar() {
  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar__drag" data-tauri-drag-region>
        <VoopleMark className="desktop-titlebar__mark" tauriDragRegion />
        <span className="desktop-titlebar__name" data-tauri-drag-region>Voople</span>
        <span className="desktop-titlebar__channel" data-tauri-drag-region>desktop</span>
      </div>
      <div className="desktop-titlebar__controls" aria-label="Управление окном">
        <button
          type="button"
          onClick={() => void runWindowAction("minimize")}
          aria-label="Свернуть окно"
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void runWindowAction("maximize")}
          aria-label="Развернуть или восстановить окно"
        >
          <Square aria-hidden />
        </button>
        <button
          type="button"
          className="desktop-titlebar__close"
          onClick={() => void runWindowAction("close")}
          aria-label="Закрыть окно"
        >
          <X aria-hidden />
        </button>
      </div>
    </header>
  );
}
