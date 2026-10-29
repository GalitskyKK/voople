"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";

function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-voople-room-group", "data-voople-room-channel"] });
  return () => observer.disconnect();
}
const getMain = () => document.querySelector<HTMLElement>("[data-voople-main-area]");
const serverRoot = () => null;
type Frame = { left: number; top: number; width: number; height: number };

/** Keep one portal/media stage mounted while its bounds follow the Group chat pane. */
export function useVoiceRoomPlacement({ groupId, open, fullscreen, onClose }: {
  groupId?: string; open: boolean; fullscreen: boolean; onClose: () => void;
}) {
  const orbit = useInterfaceDesign() === "orbit";
  const main = useSyncExternalStore(subscribe, getMain, serverRoot);
  const getHost = useCallback(() => orbit && groupId
    ? Array.from(document.querySelectorAll<HTMLElement>("[data-voople-room-group]")).find((node) => node.dataset.voopleRoomGroup === groupId) ?? null : null, [groupId, orbit]);
  const host = useSyncExternalStore(subscribe, getHost, serverRoot);
  const getChannel = useCallback(() => orbit && groupId ? Array.from(document.querySelectorAll<HTMLElement>("[data-voople-room-channel]")).find(node => node.dataset.voopleRoomChannel === groupId) ?? null : null, [groupId, orbit]);
  const channel = useSyncExternalStore(subscribe, getChannel, serverRoot);
  const [frame, setFrame] = useState<Frame | null>(null);
  const wasEmbedded = useRef(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (!orbit || !groupId || !host) return;
    const publish = (active: boolean) => window.dispatchEvent(new CustomEvent("voople:group-room-presentation", { detail: { groupId, open: active } }));
    publish(open);
    return () => { publish(false); };
  }, [groupId, host, open, orbit]);

  useEffect(() => {
    if (!open) { wasEmbedded.current = false; wasVisible.current = false; return; }
    if (host) wasEmbedded.current = true;
    else if (wasEmbedded.current && !fullscreen) { wasEmbedded.current = false; onClose(); }
  }, [fullscreen, host, onClose, open]);

  useEffect(() => {
    if (!open || !host || fullscreen || !groupId) return;
    const frameId = requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("voople:open-group-room", { detail: groupId })));
    return () => cancelAnimationFrame(frameId);
  }, [fullscreen, groupId, host, open]);

  useLayoutEffect(() => {
    if (!open || !main || !host || fullscreen) return;
    const update = () => {
      const bounds = host.getBoundingClientRect(), parent = main.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) wasVisible.current = true;
      else if (wasVisible.current) { onClose(); return; }
      const next = { left: bounds.left - parent.left + main.scrollLeft, top: bounds.top - parent.top + main.scrollTop, width: bounds.width, height: bounds.height };
      setFrame((current) => current && Object.entries(next).every(([key, value]) => current[key as keyof Frame] === value) ? current : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host); observer.observe(main);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); document.removeEventListener("scroll", update, true); };
  }, [fullscreen, host, main, onClose, open]);

  return { main, channel, orbitGroup: orbit && Boolean(groupId), embedded: Boolean(host && !fullscreen), frame: host && !fullscreen ? frame : null };
}
