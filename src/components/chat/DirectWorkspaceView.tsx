"use client";
import { Info, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { useGroupWorkspaceMode } from "@/hooks/useGroupWorkspaceMode";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";

/** Same header/context/chat geometry as Groups; the shell supplies the named DM rows. */
export function DirectWorkspaceView({ header, children, inbox = false }: { header?: ReactNode; children?: ReactNode; inbox?: boolean }) {
  const orbit = useInterfaceDesign() === "orbit";
  const { ref, mode: measuredMode } = useGroupWorkspaceMode(undefined, orbit);
  const large = useIsLgViewport();
  const mode = large && measuredMode === "compact" ? "medium" : measuredMode;
  const [infoChoice, setInfoChoice] = useState<boolean | null>(null);
  const infoOpen = infoChoice ?? mode === "wide";
  const infoTrigger = useRef<HTMLButtonElement>(null);
  const infoClose = useRef<HTMLButtonElement>(null);
  const close = () => { setInfoChoice(false); infoTrigger.current?.focus(); };
  useEffect(() => {
    if (!infoOpen || mode === "wide") return;
    infoClose.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); setInfoChoice(false); infoTrigger.current?.focus();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [infoOpen, mode]);
  if (!orbit) return <>{header}<div className="voople-stage flex min-h-0 flex-1 flex-col">{children}</div></>;
  return <div ref={ref} className="voople-direct-workspace" data-mode={mode} data-inbox={inbox} data-info-open={infoOpen}>
    <header className="voople-direct-workspace__header">
      <div className="voople-direct-workspace__context-title"><strong>Личные сообщения</strong><span data-voople-slot="direct-create" /></div>
      <div className="voople-direct-workspace__thread-title">{header}<button ref={infoTrigger} type="button" className="voople-direct-workspace__info-trigger" aria-label="Информация о диалоге" aria-expanded={infoOpen} onClick={() => setInfoChoice(!infoOpen)}><Info className="h-4 w-4" /></button></div>
    </header>
    <div className="voople-direct-workspace__body">
      <section data-voople-slot="direct-list" className="voople-direct-workspace__list" aria-label="Личные сообщения" />
      <section className="voople-direct-workspace__chat" aria-label="Переписка" inert={mode === "compact" && infoOpen}>{children}</section>
      {infoOpen ? <aside className="voople-direct-workspace__info" aria-label="Информация о диалоге"><header><strong>Информация о диалоге</strong><button ref={infoClose} type="button" aria-label="Закрыть информацию о диалоге" onClick={close}><X className="h-4 w-4" /></button></header><div data-voople-slot="direct-info" className="voople-scroll" /></aside> : null}
    </div>
  </div>;
}
