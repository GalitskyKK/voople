import { DoorOpen, UserPlus } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import type { ChatRoomParticipantView } from "@/types/chat";

type VoiceRoomEmptyStateProps = {
  participant?: ChatRoomParticipantView;
  state: "preview" | "inside";
  onInvite?: () => void;
};

export function VoiceRoomEmptyState({ participant, state, onInvite }: VoiceRoomEmptyStateProps) {
  const inside = state === "inside";

  if (inside && participant) {
    return (
      <div className="voople-full-room__solo grid h-full min-h-72 overflow-hidden rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-left sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.55fr)]">
        <div className="flex min-w-0 flex-col justify-center border-b border-[var(--app-border)] px-6 py-8 sm:border-b-0 sm:border-r sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">
            Один в комнате
          </p>
          <h3 className="mt-3 text-xl font-semibold">Вы пока один</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
            Позовите друзей — комната останется активной, пока вы переходите по Voople.
          </p>
          {onInvite ? (
            <Button type="button" onClick={onInvite} className="mt-5 self-start">
              <UserPlus className="h-4 w-4" />
              Позвать
            </Button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center px-6 py-8 text-center">
          <ProfileAvatarVisual
            displayName={participant.displayName}
            size="lg"
            isOnline
            avatarImage={participant.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : undefined}
          />
          <p className="mt-4 max-w-full truncate text-sm font-medium">{participant.displayName} · вы</p>
          <p className="mt-1 max-w-full truncate text-xs text-[var(--app-muted)]">@{participant.username}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voople-full-room__empty flex h-full min-h-72 flex-col items-center justify-center rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--theme-accent)]">
        <DoorOpen className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-xl font-semibold">Комната готова</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">
        Войдите первым — остальные участники смогут присоединиться из этого чата.
      </p>
    </div>
  );
}
