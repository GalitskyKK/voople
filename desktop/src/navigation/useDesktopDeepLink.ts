import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";

import { roomInviteIdFromPath } from "@/lib/chat/core-room-invite-preview";

const DEEP_LINK_EVENT = "desktop-deep-link";

function isSupportedDeepLinkPath(value: unknown): value is string {
  return typeof value === "string" && roomInviteIdFromPath(value) !== null;
}

export function useDesktopDeepLink() {
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    let active = true;
    let stopListening: (() => void) | undefined;
    const consumeNativePath = async () => {
      const path = await invoke<unknown>("take_pending_deep_link");
      if (active && isSupportedDeepLinkPath(path)) setPendingPath(path);
    };

    void listen(DEEP_LINK_EVENT, () => {
      void consumeNativePath().catch(() => undefined);
    })
      .then((unlisten) => {
        if (!active) {
          unlisten();
          return;
        }
        stopListening = unlisten;
        return consumeNativePath();
      })
      .catch(() => undefined);

    return () => {
      active = false;
      stopListening?.();
    };
  }, []);

  const clearPendingPath = useCallback(() => setPendingPath(null), []);
  return { clearPendingPath, pendingPath };
}
