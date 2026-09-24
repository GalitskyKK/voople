"use client";

import { reportProductEvent } from "@/lib/telemetry/client";
import type { useVoiceDockPresentation } from "./useVoiceDockPresentation";

type DockPresentation = ReturnType<typeof useVoiceDockPresentation>;

export function useVoiceRoomPresentationActions({
  dock,
  inside,
  leavePending,
  chatId,
  chatType,
  sessionId,
  resetSurface,
  setMediaError,
  stopMicTest,
  parkMedia,
  requestLeaveRoom,
  onLeaveConfirmed,
}: {
  dock: DockPresentation;
  inside: boolean;
  leavePending: boolean;
  chatId: string;
  chatType: "direct" | "group";
  sessionId: string | null;
  resetSurface: () => void;
  setMediaError: (error: string | null) => void;
  stopMicTest: () => void;
  parkMedia: () => void;
  requestLeaveRoom: () => Promise<boolean>;
  onLeaveConfirmed?: (chatId: string, sessionId: string | null) => void;
}) {
  const openRoom = () => {
    resetSurface();
    setMediaError(null);
    dock.openFull();
    reportProductEvent("room_opened", { kind: chatType });
  };
  const closeRoom = (target: "mini" | "compact" | "hidden" = "compact") => {
    if (leavePending) return;
    stopMicTest();
    parkMedia();
    resetSurface();
    if (target === "mini" && inside) dock.closeToMini();
    else if (target === "compact" && inside) dock.closeToCompact();
    else dock.hide();
  };
  const leaveRoom = async () => {
    if (!await requestLeaveRoom()) {
      // A Dock has no room for recovery copy: open Full with the existing retry state.
      if (dock.dockVisible) dock.openFull();
      return;
    }
    stopMicTest();
    parkMedia();
    dock.leaveConfirmed();
    onLeaveConfirmed?.(chatId, sessionId);
    resetSurface();
  };
  return {
    openRoom,
    closeRoom,
    leaveRoom,
    minimizePanel: (showDock = true) => closeRoom(showDock ? "compact" : "hidden"),
  };
}
