"use client";

import { useState } from "react";
import { ChevronDown, MonitorUp, Radio } from "lucide-react";

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

export function GroupLiveShelfView({
  rooms,
  currentUserRoomId,
  pendingRoomId,
  onJoinRoom,
}: {
  rooms: GroupNowRoom[];
  currentUserRoomId: string | null;
  pendingRoomId?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
}) {
  const [openOverflow, setOpenOverflow] = useState<string | null>(null);
  const activeRooms = rooms
    .filter((room) => room.participantCount > 0)
    .sort((left, right) => Number(right.kind === "lobby") - Number(left.kind === "lobby"));
  if (!activeRooms.length) return null;

  return (
    <section
      className="voople-group-live-shelf shrink-0 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
      aria-labelledby="group-live-shelf-title"
    >
      <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3">
        <div className="min-w-[5.5rem] shrink-0">
          <h2 id="group-live-shelf-title" className="text-[11px] font-semibold text-[var(--foreground)]">
            Сейчас в голосе
          </h2>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--app-muted)]">
            {formatConversationCount(activeRooms.length)}
          </p>
        </div>

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
                          <span className="font-mono text-[10px] text-[var(--app-muted)]">
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
