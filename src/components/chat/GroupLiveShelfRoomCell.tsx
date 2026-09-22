import { AudioLines, MonitorUp, UsersRound } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { cn } from "@/lib/utils";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom } from "@/types/group-now";

const actionLabels = {
  join: "Зайти",
  switch: "Перейти",
  current: "Вы здесь",
} as const;

export function GroupLiveShelfRoomCell({
  room,
  currentUserRoomId,
  pending,
  onJoinRoom,
}: {
  room: GroupNowRoom;
  currentUserRoomId: string | null;
  pending: boolean;
  onJoinRoom: (room: GroupNowRoom) => void;
}) {
  const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
  const current = action === "current";
  const visibleParticipants = room.participants.slice(0, 3);
  const overflowCount = Math.max(0, room.participants.length - visibleParticipants.length);
  const label = `${actionLabels[action]}: ${room.name}, ${room.participantCount} в голосе${room.hasScreenShare ? ", идёт демонстрация" : ""}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "true" : undefined}
      aria-busy={pending || undefined}
      disabled={pending || current}
      onClick={() => onJoinRoom(room)}
      className={cn(
        "voople-room-material voople-live-room-card group relative flex min-h-[7rem] min-w-0 flex-1 overflow-hidden rounded-xl p-4 text-left disabled:cursor-default",
        current && "voople-live-room-card--current",
        pending && "voople-live-room-card--pending",
      )}
    >
      <span className="voople-room-material__highlight" aria-hidden="true" />
      <span className="voople-room-material__reflection" aria-hidden="true" />

      <span className="relative z-[3] flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold leading-4 tracking-[-0.01em] text-[var(--foreground)]">{room.name}</span>
          <span className="voople-live-room-card__count flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs leading-4">
            <UsersRound className="h-2.5 w-2.5" aria-hidden="true" />
            {room.participantCount}
          </span>
        </span>

        <span className="mt-2.5 flex min-w-0 items-center justify-between gap-2">
          <span className="relative flex min-w-0 items-center pl-0.5" aria-hidden="true">
            {visibleParticipants.length > 0 ? (
              <>
                {visibleParticipants.map((participant, index) => (
                  <ProfileAvatarVisual
                    key={participant.id}
                    displayName={participant.displayName}
                    size="sm"
                    isOnline
                    shape="round"
                    className={cn("h-8 w-8 shrink-0", index > 0 && "-ml-2")}
                    ringClassName={cn("ring-2 ring-[#0c121b]", current && index === 0 && "ring-[color-mix(in_srgb,var(--voople-ice)_65%,#0c121b)]")}
                    avatarImage={participant.avatarUrl ? (
                      // Shared portable surface: Next Image cannot be used by Tauri.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : undefined}
                  />
                ))}
                {overflowCount > 0 ? (
                  <span className="voople-live-room-card__overflow -ml-1.5 grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold">+{overflowCount}</span>
                ) : null}
              </>
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--app-border)] bg-black/10">
                <UsersRound className="h-3.5 w-3.5 text-[var(--app-muted)]" />
              </span>
            )}
          </span>
          <span className={cn("voople-live-room-card__activity grid h-7 w-7 shrink-0 place-items-center rounded-lg", room.hasScreenShare && "voople-live-room-card__activity--screen")} aria-hidden="true">
            {room.hasScreenShare ? <MonitorUp className="h-3.5 w-3.5" /> : <AudioLines className="h-3.5 w-3.5" />}
          </span>
        </span>

        <span className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
          <span className={cn("min-w-0 truncate text-xs leading-4", current ? "voople-live-room-card__current" : "text-[var(--app-muted)]")}>
            {current ? "Вы здесь" : room.hasScreenShare ? "Идёт демонстрация" : `${room.participantCount} в голосе`}
          </span>
          {!current ? <span className="shrink-0 text-xs font-medium leading-4 text-[var(--voople-ice)] opacity-0 transition-opacity group-hover:opacity-100">{pending ? "…" : actionLabels[action]}</span> : null}
        </span>
      </span>
    </button>
  );
}
