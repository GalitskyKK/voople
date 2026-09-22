"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, MonitorUp, Radio } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom } from "@/types/group-now";

import { GroupLiveShelfRoomCell } from "./GroupLiveShelfRoomCell";

const layoutLimits = [["wide", 3], ["medium", 2], ["compact", 1]] as const;
type ShelfPreferenceListener = () => void;
const shelfPreferenceMemory = new Map<string, boolean>();
const shelfPreferenceListeners = new Map<string, Set<ShelfPreferenceListener>>();

export function GroupLiveShelfView({ groupId, rooms, currentUserRoomId, pendingRoomId, onJoinRoom }: {
  groupId: string;
  rooms: GroupNowRoom[];
  currentUserRoomId: string | null;
  pendingRoomId?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
}) {
  const [openOverflow, setOpenOverflow] = useState<string | null>(null);
  const preferenceKey = shelfPreferenceKey(groupId);
  const subscribeToPreference = useCallback((listener: ShelfPreferenceListener) => subscribeShelfPreference(preferenceKey, listener), [preferenceKey]);
  const readPreference = useCallback(() => readShelfPreference(preferenceKey), [preferenceKey]);
  const collapsed = useSyncExternalStore(subscribeToPreference, readPreference, () => false);
  const activeRooms = rooms.filter((room) => room.participantCount > 0).sort((left, right) => Number(right.kind === "lobby") - Number(left.kind === "lobby"));

  if (!activeRooms.length) return null;
  const toggleCollapsed = () => writeShelfPreference(preferenceKey, !collapsed);

  if (collapsed) {
    return (
      <section className="voople-group-live-shelf voople-group-live-shelf--collapsed shrink-0 px-4 py-1.5">
        <button type="button" onClick={toggleCollapsed} aria-expanded="false" aria-label="Развернуть активные разговоры" className="voople-group-live-shelf__collapsed-button flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="shrink-0 text-xs font-semibold leading-4 text-[var(--foreground)]">Сейчас</span>
          <span className="min-w-0 truncate text-xs leading-4 text-[var(--app-muted)]">{formatCollapsedRooms(activeRooms)}</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="voople-group-live-shelf shrink-0 px-4 py-3" aria-labelledby="group-live-shelf-title">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <button type="button" onClick={toggleCollapsed} aria-expanded="true" aria-label="Свернуть активные разговоры" className="flex items-center gap-2 rounded-md text-left">
          <span id="group-live-shelf-title" className="text-xs font-semibold leading-4 text-[var(--foreground)]">Сейчас в голосе</span>
          <span className="voople-group-live-shelf__count rounded-md px-1.5 py-0.5 text-xs leading-4 text-[var(--app-muted)]">{formatConversationCount(activeRooms.length)}</span>
          <ChevronUp className="h-3.5 w-3.5 text-[var(--app-muted)]" aria-hidden="true" />
        </button>
      </div>

      <div className="min-w-0">
        {layoutLimits.map(([layout, limit]) => {
          const visibleRooms = activeRooms.slice(0, limit);
          const overflowRooms = activeRooms.slice(limit);
          return (
            <div key={layout} className={`voople-group-live-shelf__layout voople-group-live-shelf__layout--${layout} min-w-0 items-stretch gap-2`}>
              {visibleRooms.map((room) => (
                <GroupLiveShelfRoomCell key={room.id} room={room} currentUserRoomId={currentUserRoomId} pending={pendingRoomId === room.id} onJoinRoom={onJoinRoom} />
              ))}
              {overflowRooms.length > 0 ? (
                <DropdownMenu
                  open={openOverflow === layout}
                  onOpenChange={(open) => setOpenOverflow(open ? layout : null)}
                  align="end"
                  trigger={(
                    <Button type="button" size="sm" variant="ghost" className="voople-group-live-shelf__more min-h-[6rem] shrink-0 rounded-xl px-3 text-xs" aria-label={`Ещё комнат: ${overflowRooms.length}`} aria-expanded={openOverflow === layout}>
                      +{overflowRooms.length}<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                  menuClassName="w-64 rounded-xl"
                >
                  {overflowRooms.map((room) => {
                    const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
                    return (
                      <button key={room.id} type="button" role="menuitem" disabled={pendingRoomId === room.id || action === "current"} onClick={() => { setOpenOverflow(null); if (action !== "current") onJoinRoom(room); }} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-surface-soft)] focus-visible:outline-none disabled:opacity-60">
                        {room.hasScreenShare ? <MonitorUp className="h-4 w-4 shrink-0 text-[var(--voople-ice)]" aria-hidden="true" /> : <Radio className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />}
                        <span className="min-w-0 flex-1 truncate font-medium">{room.name}</span>
                        <span className="text-xs text-[var(--app-muted)]">{action === "current" ? "вы" : room.participantCount}</span>
                      </button>
                    );
                  })}
                </DropdownMenu>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatConversationCount(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const noun = mod100 >= 11 && mod100 <= 14 ? "разговоров" : mod10 === 1 ? "разговор" : mod10 >= 2 && mod10 <= 4 ? "разговора" : "разговоров";
  return `${count} ${noun}`;
}

function formatCollapsedRooms(rooms: GroupNowRoom[]) {
  const visible = rooms.slice(0, 2).map((room) => `${room.name} ${room.participantCount}`);
  const hiddenCount = rooms.length - visible.length;
  if (hiddenCount > 0) visible.push(`ещё ${hiddenCount}`);
  return visible.join(" · ");
}

function shelfPreferenceKey(groupId: string) { return `voople:group-live-shelf-collapsed:v1:${groupId}`; }
function readShelfPreference(key: string) {
  const memoryValue = shelfPreferenceMemory.get(key);
  if (memoryValue !== undefined) return memoryValue;
  let collapsed = false;
  try { collapsed = window.localStorage.getItem(key) === "1"; } catch { /* memory fallback */ }
  shelfPreferenceMemory.set(key, collapsed);
  return collapsed;
}
function writeShelfPreference(key: string, collapsed: boolean) {
  shelfPreferenceMemory.set(key, collapsed);
  try { window.localStorage.setItem(key, collapsed ? "1" : "0"); } catch { /* memory fallback */ }
  shelfPreferenceListeners.get(key)?.forEach((listener) => listener());
}
function subscribeShelfPreference(key: string, listener: ShelfPreferenceListener) {
  const listeners = shelfPreferenceListeners.get(key) ?? new Set<ShelfPreferenceListener>();
  listeners.add(listener);
  shelfPreferenceListeners.set(key, listeners);
  const handleStorage = (event: StorageEvent) => { if (event.key !== key) return; shelfPreferenceMemory.delete(key); listener(); };
  window.addEventListener("storage", handleStorage);
  return () => { listeners.delete(listener); if (listeners.size === 0) shelfPreferenceListeners.delete(key); window.removeEventListener("storage", handleStorage); };
}
