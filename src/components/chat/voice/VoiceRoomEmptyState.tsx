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
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border border-[var(--app-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--app-surface)_92%,transparent),color-mix(in_srgb,var(--theme-accent)_8%,var(--app-surface)))] px-6 py-10 text-center">
      {participant ? (
        <ProfileAvatarVisual
          displayName={participant.displayName}
          size="lg"
          isOnline
          avatarImage={participant.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : undefined}
        />
      ) : <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"><DoorOpen className="h-9 w-9" /></span>}
      <h3 className="mt-5 text-xl font-semibold">{inside ? "Вы пока один" : "Комната готова"}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">
        {inside
          ? "Позовите друзей — комната останется активной, пока вы переходите по Voople."
          : "Войдите первым — остальные участники смогут присоединиться из этого чата."}
      </p>
      {inside && onInvite ? <Button type="button" onClick={onInvite} className="mt-5"><UserPlus className="h-4 w-4" />Позвать участников</Button> : null}
    </div>
  );
}
