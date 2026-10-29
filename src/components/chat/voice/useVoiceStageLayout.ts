"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { resolveVoiceStageLayout, type VoiceStageSelection } from "@/lib/livekit/voice-stage-layout";

export function useVoiceStageLayout(screenTrackId: string | null, screenOwner: string | null, cameras: ReadonlySet<string>, stage: RefObject<HTMLDivElement | null>) {
  const screenKey = `${screenTrackId ?? ""}:${screenOwner ?? ""}`;
  const [selection, setSelection] = useState<VoiceStageSelection | null>(null);
  const { focusedMediaId, layout } = resolveVoiceStageLayout(screenKey, screenOwner, cameras, selection);
  const focusMedia = (id: string) => setSelection({ screenKey, focusedMediaId: id, layout: "focus" });
  const selectLayout = useCallback((next: "focus" | "grid") => setSelection({ screenKey, focusedMediaId, layout: next }), [screenKey, focusedMediaId]);
  useEffect(() => {
    if (layout !== "focus" || !focusedMediaId) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[data-voople-dropdown-menu], [role="dialog"], [data-voople-group-people-drawer], .voople-room-chat-panel')) return;
      const room = stage.current?.closest('[data-voople-room-surface]');
      if (!room || !(event.target instanceof Node) || !room.contains(event.target)) return;
      event.preventDefault(); event.stopPropagation(); selectLayout("grid");
    };
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, [layout, focusedMediaId, selectLayout, stage]);
  return { activeFocusId: focusedMediaId, layout, focusMedia, selectLayout };
}
