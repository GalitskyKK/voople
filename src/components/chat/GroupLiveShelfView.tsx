"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, MonitorUp, Radio } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom } from "@/types/group-now";

import { GroupLiveShelfRoomCell } from "./GroupLiveShelfRoomCell";

const layoutLimits = [
  ["wide", 3],
  ["medium", 2],
  ["compact", 1],
] as const;

type ShelfPreferenceListener = () => void;

const shelfPreferenceMemory = new Map<string, boolean>();
const shelfPreferenceListeners = new Map<string, Set<ShelfPreferenceListener>>();

export function GroupLiveShelfView({
  groupId,
  rooms,
  currentUserRoomId,
  pendingRoomId,
  onJoinRoom,
}: {
  groupId: string;
  rooms: GroupNowRoom[];
  currentUserRoomId: string | null;
  pendingRoomId?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
}) {
  const [openOverflow, setOpenOverflow] = useState<string | null>(null);
  const preferenceKey = shelfPreferenceKey(groupId);
  const subscribeToPreference = useCallback(
    (listener: ShelfPreferenceListener) => subscribeShelfPreference(preferenceKey, listener),
    [preferenceKey],
  );
  const readPreference = useCallback(() => readShelfPreference(preferenceKey), [preferenceKey]);
  const collapsed = useSyncExternalStore(subscribeToPreference, readPreference, () => false);
  const activeRooms = rooms
    .filter((room) => room.participantCount > 0)
    .sort((left, right) => Number(right.kind === "lobby") - Number(left.kind === "lobby"));

  if (!activeRooms.length) return null;

  const toggleCollapsed = () => {
    writeShelfPreference(preferenceKey, !collapsed);
  };

  if (collapsed) {
    return (
      <section className="voople-group-live-shelf shrink-0 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1">
        <div className="mx-auto w-full max-w-[1040px]">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded="false"
            aria-label="Развернуть активные разговоры"
            className="flex min-h-11 w-full items-center gap-2 rounded-[var(--app-radius-sm)] px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)] lg:min-h-8"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="shrink-0 text-xs font-semibold leading-4 text-[var(--foreground)]">Сейчас в голосе</span>
            <span className="min-w-0 truncate text-xs leading-4 text-[var(--app-muted)]">
              {formatCollapsedRooms(activeRooms)}
            </span>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="voople-group-live-shelf shrink-0 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
      aria-labelledby="group-live-shelf-title"
    >
      <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded="true"
          aria-label="Свернуть активные разговоры"
          className="min-h-11 min-w-[5.5rem] shrink-0 rounded-[var(--app-radius-sm)] px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)] lg:min-h-8"
        >
          <span id="group-live-shelf-title" className="flex items-center gap-1 text-xs font-semibold leading-4 text-[var(--foreground)]">
            Сейчас в голосе
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block font-mono text-xs leading-4 text-[var(--app-muted)]">
            {formatConversationCount(activeRooms.length)}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          {layoutLimits.map(([layout, limit]) => {
            const visibleRooms = activeRooms.slice(0, limit);
            const overflowRooms = activeRooms.slice(limit);
            return (
              <div
                key={layout}
                className={`voople-group-live-shelf__layout voople-group-live-shelf__layout--${layout} min-w-0 items-stretch gap-1.5`}
              >
                {visibleRooms.map((room) => (
                  <GroupLiveShelfRoomCell
                    key={room.id}
                    room={room}
                    currentUserRoomId={currentUserRoomId}
                    pending={pendingRoomId === room.id}
                    onJoinRoom={onJoinRoom}
                  />
                ))}
                {overflowRooms.length > 0 ? (
                  <DropdownMenu
                    open={openOverflow === layout}
                    onOpenChange={(open) => setOpenOverflow(open ? layout : null)}
                    align="end"
                    trigger={(
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-full min-h-12 shrink-0 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] px-2 text-xs"
                        aria-label={`Ещё комнат: ${overflowRooms.length}`}
                        aria-expanded={openOverflow === layout}
                      >
                        +{overflowRooms.length}
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                    menuClassName="w-64 rounded-[var(--app-radius-md)]"
                  >
                    {overflowRooms.map((room) => {
                      const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          role="menuitem"
                          disabled={pendingRoomId === room.id || action === "current"}
                          onClick={() => {
                            setOpenOverflow(null);
                            if (action !== "current") onJoinRoom(room);
                          }}
                          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-surface-soft)] focus-visible:outline-none disabled:opacity-60"
                        >
                          {room.hasScreenShare ? (
                            <MonitorUp className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                          ) : (
                            <Radio className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">{room.name}</span>
                          <span className="font-mono text-xs leading-4 text-[var(--app-muted)]">
                            {action === "current" ? "вы" : room.participantCount}
                          </span>
                        </button>
                      );
                    })}
                  </DropdownMenu>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function formatConversationCount(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const noun = mod100 >= 11 && mod100 <= 14
    ? "разговоров"
    : mod10 === 1
      ? "разговор"
      : mod10 >= 2 && mod10 <= 4
        ? "разговора"
        : "разговоров";
  return `${count} ${noun}`;
}

function formatCollapsedRooms(rooms: GroupNowRoom[]) {
  const visible = rooms.slice(0, 2).map((room) => `${room.name} ${room.participantCount}`);
  const hiddenCount = rooms.length - visible.length;
  if (hiddenCount > 0) visible.push(`Ещё ${hiddenCount}`);
  return visible.join(" · ");
}

function shelfPreferenceKey(groupId: string) {
  return `voople:group-live-shelf-collapsed:v1:${groupId}`;
}

function readShelfPreference(key: string) {
  const memoryValue = shelfPreferenceMemory.get(key);
  if (memoryValue !== undefined) return memoryValue;

  let collapsed = false;
  try {
    collapsed = window.localStorage.getItem(key) === "1";
  } catch {
    // In-memory preferences keep the control usable when storage is unavailable.
  }
  shelfPreferenceMemory.set(key, collapsed);
  return collapsed;
}

function writeShelfPreference(key: string, collapsed: boolean) {
  shelfPreferenceMemory.set(key, collapsed);
  try {
    window.localStorage.setItem(key, collapsed ? "1" : "0");
  } catch {
    // In-memory preferences keep the control usable when storage is unavailable.
  }
  shelfPreferenceListeners.get(key)?.forEach((listener) => listener());
}

function subscribeShelfPreference(key: string, listener: ShelfPreferenceListener) {
  const listeners = shelfPreferenceListeners.get(key) ?? new Set<ShelfPreferenceListener>();
  listeners.add(listener);
  shelfPreferenceListeners.set(key, listeners);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== key) return;
    shelfPreferenceMemory.delete(key);
    listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) shelfPreferenceListeners.delete(key);
    window.removeEventListener("storage", handleStorage);
  };
}
