"use client";

import { UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useGroupWorkspaceMode } from "@/hooks/useGroupWorkspaceMode";
import { GroupSurfaceTabs, type GroupSurfaceTab } from "./GroupSurfaceTabs";
import { GroupIdentitySlotContext } from "./GroupIdentitySlotContext";
import { GroupPeopleActionContext } from "./GroupPeopleActionContext";

/** Shared composition for web, desktop and the visual fixture. */
export function GroupWorkspaceView({ header, live, chat, renderPeople, combineHeader, activeTab, onTabChange }: {
  header: ReactNode;
  live: ReactNode;
  chat: ReactNode;
  renderPeople: (desktop: boolean) => ReactNode;
  combineHeader?: boolean;
  activeTab: GroupSurfaceTab;
  onTabChange: (tab: GroupSurfaceTab) => void;
}) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [identitySlot, setIdentitySlot] = useState<HTMLElement | null>(null);
  const peopleTrigger = useRef<HTMLButtonElement>(null);
  const peopleClose = useRef<HTMLButtonElement>(null);
  const peoplePane = useRef<HTMLElement>(null);
  const onModeChange = useCallback((_next: string, previous: string) => {
    if (previous === "medium") setPeopleOpen(false);
  }, []);
  const { ref, mode } = useGroupWorkspaceMode(onModeChange);
  const desktop = mode !== "compact";

  useEffect(() => {
    if (mode !== "medium" || !peopleOpen) return;
    peopleClose.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPeopleOpen(false);
      peopleTrigger.current?.focus();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [mode, peopleOpen]);

  const closePeople = () => {
    setPeopleOpen(false);
    peopleTrigger.current?.focus();
  };
  const openPeople = () => {
    if (mode === "medium") setPeopleOpen(true);
    else if (mode === "wide") peoplePane.current?.focus();
  };
  const people = renderPeople(desktop);
  const peopleAction = mode === "medium" ? <button ref={peopleTrigger} type="button"
    className="voople-group-surface__people-action" aria-label="Показать участников группы"
    aria-expanded={peopleOpen} aria-controls={peopleOpen ? "voople-group-people-drawer" : undefined}
    onClick={() => setPeopleOpen((open) => !open)}>
    <UsersRound className="h-4 w-4" aria-hidden="true" />Люди
  </button> : null;

  return (
    <GroupIdentitySlotContext.Provider value={identitySlot}>
    <GroupPeopleActionContext.Provider value={{ action: peopleAction, openPeople }}>
    <div ref={ref} className="voople-group-surface flex min-h-0 flex-1 flex-col" data-mode={mode}>
      <div className={`voople-group-surface-header${combineHeader ? " voople-group-surface-header--combined" : ""}${desktop ? " voople-group-surface-header--desktop" : ""}`}>
        {header}
        {!desktop ? <GroupSurfaceTabs activeTab={activeTab} onTabChange={onTabChange} /> : null}
      </div>
      <div className={`voople-stage voople-group-workspace min-h-0 flex-1${desktop ? " voople-group-workspace--desktop" : ""}`}>
        {desktop || activeTab === "now" ? <section className="voople-group-workspace__live" aria-label="Комнаты группы">{desktop ? <div ref={setIdentitySlot} className="voople-group-pane-identity" /> : null}<div className="voople-group-workspace__rooms-scroll voople-scroll">{live}</div></section> : null}
        {desktop || activeTab === "chat" ? <section className="voople-group-workspace__chat" aria-label="Чат группы">{chat}</section> : null}
        {mode === "wide" || activeTab === "people" && !desktop ? <section ref={peoplePane} tabIndex={-1} className="voople-group-workspace__people" aria-label="Люди группы">{people}</section> : null}
        {mode === "medium" && peopleOpen ? <aside id="voople-group-people-drawer"
          className="voople-group-workspace__people-drawer" aria-label="Участники группы">
          <div className="voople-group-workspace__drawer-header"><strong>Люди</strong>
            <button ref={peopleClose} type="button" aria-label="Закрыть список участников" onClick={closePeople}><X className="h-4 w-4" /></button>
          </div>
          {people}
        </aside> : null}
      </div>
    </div>
    </GroupPeopleActionContext.Provider>
    </GroupIdentitySlotContext.Provider>
  );
}
