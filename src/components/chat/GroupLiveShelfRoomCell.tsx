import { MonitorUp, Radio, UsersRound } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
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
  const visibleParticipants = room.participants.slice(0, 3);
  const label = `${actionLabels[action]}: ${room.name}, ${room.participantCount} в голосе${room.hasScreenShare ? ", идёт демонстрация" : ""}`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={action === "current" ? "true" : undefined}
      aria-busy={pending}
      disabled={pending || action === "current"}
      onClick={() => onJoinRoom(room)}
      className="voople-group-live-shelf__room flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--background)] px-2.5 text-left transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)] disabled:opacity-70"
    >
      <span className="relative flex min-w-[2rem] shrink-0 items-center" aria-hidden="true">
        {visibleParticipants.length > 0 ? visibleParticipants.map((participant, index) => (
            <ProfileAvatarVisual
              key={participant.id}
              displayName={participant.displayName}
              size="sm"
              isOnline
              shape="square"
              className={index === 0 ? "" : "-ml-3"}
              ringClassName="ring-2 ring-[var(--background)]"
              avatarImage={participant.avatarUrl ? (
                // Shared portable surface: Next Image cannot be used by Tauri.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : undefined}
            />
          )) : (
            <span className="grid h-8 w-8 place-items-center rounded-[var(--app-radius-sm)] bg-[var(--app-surface-soft)]">
              <UsersRound className="h-4 w-4 text-[var(--app-muted)]" />
            </span>
          )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-4 text-[var(--foreground)]">{room.name}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-[var(--app-muted)]">
          {room.hasScreenShare ? (
            <MonitorUp className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <Radio className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
          )}
          <span className="truncate">
            {action === "current" ? "Вы здесь" : `${room.participantCount} в голосе`}
          </span>
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs leading-4 text-[var(--theme-accent)]">
        {pending ? "…" : action === "current" ? "Вы" : actionLabels[action]}
      </span>
    </button>
  );
}
