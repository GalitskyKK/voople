import { UsersRound } from "lucide-react";

import { groupPeopleSections } from "@/lib/chat/group-people";
import type { ChatGroupMemberView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

import { GroupPeopleSection } from "./GroupPeopleSection";
import { GroupPeopleErrorState, GroupPeopleLoadingState } from "./GroupPeoplePanelState";

export function GroupPeoplePanelView({
  members,
  now,
  onlineUserIds,
  loading = false,
  error,
  actionError,
  onRetry,
  onOpenProfile,
  currentUserId,
  currentParticipantIds,
  onVoop,
  voopingUserId,
}: {
  members?: ChatGroupMemberView[];
  now?: GroupNowView;
  onlineUserIds: ReadonlySet<string>;
  loading?: boolean;
  error?: string | null;
  actionError?: string | null;
  onRetry: () => void;
  onOpenProfile?: (username: string) => void;
  currentUserId?: string | null;
  currentParticipantIds: ReadonlySet<string>;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
}) {
  if (loading && (!members || !now)) return <GroupPeopleLoadingState />;
  if (error && (!members || !now)) return <GroupPeopleErrorState message={error} onRetry={onRetry} />;

  const sections = groupPeopleSections(members ?? [], onlineUserIds, now);
  const shared = { onOpenProfile, currentUserId, currentParticipantIds, voopingUserId };

  return (
    <section className="voople-group-people voople-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-label="Участники группы">
      <div className="mr-auto w-full max-w-[960px] space-y-6">
        {actionError ? <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">{actionError}</p> : null}

        <section aria-label={`В голосе: ${sections.live.length}`}>
          <h2 className="px-1 text-sm font-semibold text-[var(--foreground)]">В голосе <span className="ml-1 text-xs font-normal text-[var(--app-muted)]">{sections.live.length}</span></h2>
          {sections.liveRooms.length ? (
            <div className="mt-3 space-y-4">
              {sections.liveRooms.map((room) => (
                <GroupPeopleSection key={room.id} title={room.name} members={room.members} onlineUserIds={onlineUserIds} variant="live" onVoop={onVoop} {...shared} />
              ))}
            </div>
          ) : <p className="mt-2 px-1 text-xs text-[var(--app-muted)]">Сейчас в голосе никого нет.</p>}
        </section>

        <GroupPeopleSection title="Доступны" members={sections.available} onlineUserIds={onlineUserIds} variant="available" {...shared} />
        <GroupPeopleSection title="Не в сети" members={sections.offline} onlineUserIds={onlineUserIds} variant="offline" {...shared} />

        {!members?.length ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center" role="status">
            <UsersRound className="h-5 w-5 text-[var(--app-muted)]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Участников пока нет</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
