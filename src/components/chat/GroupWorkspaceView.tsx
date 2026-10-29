"use client";

import { IconButton } from "@/components/ui/IconButton";
import { UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useGroupWorkspaceMode } from "@/hooks/useGroupWorkspaceMode";
import type { GroupSurfaceTab } from "./GroupSurfaceTabs";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { GroupWorkspaceHeader } from "./GroupWorkspaceHeader";
import { GroupBannerSlotContext } from "./GroupBannerSlotContext";
import { GroupIdentitySlotContext } from "./GroupIdentitySlotContext";
import { GroupPeopleActionContext } from "./GroupPeopleActionContext";
import { GroupRoomActionSlotContext } from "./GroupRoomActionSlotContext";
import { GroupChatHeaderSlotContext } from "./GroupChatHeaderSlotContext";

/** Shared composition for web, desktop and the visual fixture. */
export function GroupWorkspaceView({ groupId, header, live, chat, renderPeople, combineHeader, activeTab, onTabChange }: {
  groupId?: string;
  header: ReactNode;
  live: ReactNode;
  chat: ReactNode;
  renderPeople: (desktop: boolean) => ReactNode;
  combineHeader?: boolean;
  activeTab: GroupSurfaceTab;
  onTabChange: (tab: GroupSurfaceTab) => void;
}) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [identitySlot, setIdentitySlot] = useState<HTMLElement | null>(null);
  const [roomActionSlot, setRoomActionSlot] = useState<HTMLElement | null>(null);
  const [bannerSlot, setBannerSlot] = useState<HTMLElement | null>(null);
  const [chatHeaderSlot, setChatHeaderSlot] = useState<HTMLElement | null>(null);
  const orbit = useInterfaceDesign() === "orbit";
  const peopleTrigger = useRef<HTMLButtonElement>(null);
  const peopleClose = useRef<HTMLButtonElement>(null);
  const peoplePane = useRef<HTMLElement>(null);
  const onModeChange = useCallback((_next: string, previous: string) => {
    if (previous === "medium") setPeopleOpen(false);
  }, []);
  const { ref, mode } = useGroupWorkspaceMode(onModeChange);
  const desktop = mode !== "compact";

  useEffect(() => {
    if (!orbit || !groupId) return;
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ groupId: string; open: boolean }>).detail;
      if (detail.groupId !== groupId) return;
      setVoiceOpen(detail.open);
      if (detail.open) setPeopleOpen(false);
    };
    window.addEventListener("voople:group-room-presentation", update);
    return () => window.removeEventListener("voople:group-room-presentation", update);
  }, [groupId, orbit]);

  useEffect(() => {
    if (!orbit || desktop || !groupId) return;
    const openRoom = (event: Event) => {
      if ((event as CustomEvent<string>).detail === groupId) onTabChange("chat");
    };
    window.addEventListener("voople:open-group-room", openRoom);
    return () => window.removeEventListener("voople:open-group-room", openRoom);
  }, [desktop, groupId, onTabChange, orbit]);

  useEffect(() => {
    if ((mode !== "medium" && !voiceOpen) || !peopleOpen) return;
    peopleClose.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPeopleOpen(false);
      peopleTrigger.current?.focus();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [mode, peopleOpen, voiceOpen]);

  const closePeople = () => {
    setPeopleOpen(false);
    peopleTrigger.current?.focus();
  };
  const openPeople = () => {
    if (mode === "medium" || voiceOpen) setPeopleOpen(true);
    else if (mode === "wide") peoplePane.current?.focus();
  };
  const people = renderPeople(desktop);
  const peopleAction = mode === "medium" || voiceOpen ? <IconButton ref={peopleTrigger} label="Участники"
    className="voople-group-surface__people-action"
    aria-expanded={peopleOpen} aria-controls={peopleOpen ? "voople-group-people-drawer" : undefined}
    onClick={() => setPeopleOpen((open) => !open)}>
    <UsersRound className="h-4 w-4" aria-hidden="true" />
  </IconButton> : null;

  return (
    <GroupIdentitySlotContext.Provider value={identitySlot}>
    <GroupRoomActionSlotContext.Provider value={roomActionSlot}>
    <GroupBannerSlotContext.Provider value={bannerSlot}>
    <GroupChatHeaderSlotContext.Provider value={chatHeaderSlot}>
    <GroupPeopleActionContext.Provider value={{ action: voiceOpen ? null : peopleAction, openPeople }}>
    <div ref={ref} className="voople-group-surface flex min-h-0 flex-1 flex-col" data-mode={mode} data-voice-open={voiceOpen}>
      <section className="voople-group-workspace-shell flex min-h-0 flex-1 flex-col" aria-label="Рабочая область группы">
      <GroupWorkspaceHeader {...{ groupId, voiceOpen, peopleAction, desktop, orbit, combineHeader, header, activeTab, onTabChange, setIdentitySlot, setRoomActionSlot, setBannerSlot, setChatHeaderSlot }} />
      <div className={`voople-stage voople-group-workspace min-h-0 flex-1${desktop ? " voople-group-workspace--desktop" : ""}`}>
        {desktop || activeTab === "now" ? <section className="voople-group-workspace__live" aria-label="Комнаты группы">{orbit ? <div className="voople-group-banner-space" aria-hidden="true" /> : desktop ? <div ref={setIdentitySlot} className="voople-group-pane-identity" /> : null}<div className="voople-group-workspace__rooms-scroll voople-scroll">{live}</div></section> : null}
        {orbit || desktop || activeTab === "chat" ? <section data-voople-room-group={orbit ? groupId : undefined} hidden={!desktop && activeTab !== "chat"} className="voople-group-workspace__chat" aria-label="Чат группы">{chat}</section> : null}
        {mode === "wide" && !voiceOpen || activeTab === "people" && !desktop ? <section ref={peoplePane} tabIndex={-1} className="voople-group-workspace__people" aria-label="Участники группы">{people}</section> : null}
        {(mode === "medium" || voiceOpen) && peopleOpen ? <aside id="voople-group-people-drawer" data-voople-group-people-drawer=""
          className="voople-group-workspace__people-drawer" aria-label="Участники группы">
          <div className="voople-group-workspace__drawer-header"><strong>Участники</strong>
            <button ref={peopleClose} type="button" aria-label="Закрыть список участников" onClick={closePeople}><X className="h-4 w-4" /></button>
          </div>
          {people}
        </aside> : null}
      </div>
      </section>
    </div>
    </GroupPeopleActionContext.Provider>
    </GroupChatHeaderSlotContext.Provider>
    </GroupBannerSlotContext.Provider>
    </GroupRoomActionSlotContext.Provider>
    </GroupIdentitySlotContext.Provider>
  );
}
