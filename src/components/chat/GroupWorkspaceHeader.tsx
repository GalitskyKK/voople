"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { GroupSurfaceTabs, type GroupSurfaceTab } from "./GroupSurfaceTabs";

export function GroupWorkspaceHeader({ groupId, voiceOpen = false, peopleAction, desktop, orbit, combineHeader, header, activeTab, onTabChange, setIdentitySlot, setRoomActionSlot, setBannerSlot, setChatHeaderSlot }: {
  groupId?: string; voiceOpen?: boolean; peopleAction?: ReactNode;
  desktop: boolean; orbit: boolean; combineHeader?: boolean; header: ReactNode;
  activeTab: GroupSurfaceTab; onTabChange: (tab: GroupSurfaceTab) => void;
  setIdentitySlot: (slot: HTMLElement | null) => void;
  setRoomActionSlot: (slot: HTMLElement | null) => void;
  setBannerSlot: (slot: HTMLElement | null) => void;
  setChatHeaderSlot: (slot: HTMLElement | null) => void;
}) {
  return <div data-active-tab={activeTab} className={`voople-group-surface-header${combineHeader ? " voople-group-surface-header--combined" : ""}${desktop ? " voople-group-surface-header--desktop" : ""}${desktop && orbit ? " voople-group-surface-header--orbit" : ""}`}>
    {!desktop && orbit ? <div ref={setBannerSlot} className="voople-group-banner-slot" /> : null}
    {desktop && orbit ? <>
      <div className="voople-group-header-column"><div ref={setBannerSlot} className="voople-group-banner-slot" /><div ref={setIdentitySlot} className="voople-group-identity-slot" /><span ref={setRoomActionSlot} className="voople-group-room-action-slot" /></div>
      <div className="voople-group-chat-header"><div ref={setChatHeaderSlot} hidden={voiceOpen} className="voople-group-chat-header__section-slot" /><div data-voople-room-channel={groupId} hidden={!voiceOpen} className="voople-room-channel-slot" /><div hidden={voiceOpen}>{header}</div>{voiceOpen ? peopleAction : null}</div>
    </> : header}
    {!desktop ? <>{voiceOpen ? <div className="voople-room-channel-mobile"><button type="button" aria-label="К комнатам" onClick={() => onTabChange("now")}><ArrowLeft className="h-4 w-4" /></button><div data-voople-room-channel={groupId} className="voople-room-channel-slot" />{peopleAction}</div> : <GroupSurfaceTabs activeTab={activeTab} onTabChange={onTabChange} endAction={<span ref={setRoomActionSlot} className="voople-group-room-action-slot" />} />}</> : null}
  </div>;
}
