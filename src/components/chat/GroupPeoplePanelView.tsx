import { Radio, UsersRound } from "lucide-react";
import { GroupAvatar } from "@/components/chat/GroupAvatar";
import type { ChatGroupMemberView } from "@/types/chat";
import { GroupPeopleVoopAction } from "./GroupPeopleVoopAction";
import { GroupPeopleErrorState, GroupPeopleLoadingState } from "./GroupPeoplePanelState";

type GroupPeoplePanelViewProps = {
  members?: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  loading?: boolean;
  error?: string | null;
  actionError?: string | null;
  onRetry: () => void;
  onOpenProfile?: (username: string) => void;
  currentUserId?: string | null;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
};

const roleLabels = {
  owner: "владелец",
  admin: "администратор",
  member: "участник",
} as const;
export function GroupPeoplePanelView({
  members,
  onlineUserIds,
  loading = false,
  error,
  actionError,
  onRetry,
  onOpenProfile,
  currentUserId,
  onVoop,
  voopingUserId,
}: GroupPeoplePanelViewProps) {
  if (loading && !members) {
    return <GroupPeopleLoadingState />;
  }

  if (error && !members) {
    return <GroupPeopleErrorState message={error} onRetry={onRetry} />;
  }

  const sorted = [...(members ?? [])].sort((left, right) => {
    const leftRank = left.activeRoom ? 0 : onlineUserIds.has(left.id) ? 1 : 2;
    const rightRank = right.activeRoom ? 0 : onlineUserIds.has(right.id) ? 1 : 2;
    return leftRank - rightRank || left.displayName.localeCompare(right.displayName, "ru");
  });
  const liveCount = sorted.filter((member) => member.activeRoom).length;
  const onlineCount = sorted.filter((member) => onlineUserIds.has(member.id)).length;
  const liveMembers = sorted.filter((member) => member.activeRoom);
  const onlineMembers = sorted.filter(
    (member) => !member.activeRoom && onlineUserIds.has(member.id),
  );
  const offlineMembers = sorted.filter(
    (member) => !member.activeRoom && !onlineUserIds.has(member.id),
  );

  return (
    <section className="voople-group-people voople-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" aria-labelledby="group-people-title">
      <div className="mr-auto w-full max-w-[760px]">
        {actionError ? (
          <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">
            {actionError}
          </p>
        ) : null}
        <header className="flex items-end justify-between gap-4 border-b border-[var(--app-border)] pb-3">
          <div>
            <h2 id="group-people-title" className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">Люди</h2>
            <p className="mt-1 text-xs text-[var(--app-muted)]">{liveCount} в разговоре · {onlineCount} в сети</p>
          </div>
          <span className="font-mono text-xs leading-4 text-[var(--app-muted)]">{sorted.length} всего</span>
        </header>

        <div className="space-y-5 pt-4">
          <GroupPeopleSection
            title="В разговоре"
            members={liveMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
            currentUserId={currentUserId}
            onVoop={onVoop}
            voopingUserId={voopingUserId}
          />
          <GroupPeopleSection
            title="Онлайн"
            members={onlineMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
            currentUserId={currentUserId}
            onVoop={onVoop}
            voopingUserId={voopingUserId}
          />
          <GroupPeopleSection
            title="Остальные"
            members={offlineMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
            currentUserId={currentUserId}
            onVoop={onVoop}
            voopingUserId={voopingUserId}
          />
        </div>

        {!sorted.length ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center" role="status">
            <UsersRound className="h-5 w-5 text-[var(--app-muted)]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Участников пока нет</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GroupPeopleSection({
  title,
  members,
  onlineUserIds,
  onOpenProfile,
  currentUserId,
  onVoop,
  voopingUserId,
}: {
  title: string;
  members: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
  currentUserId?: string | null;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
}) {
  if (!members.length) return null;
  return (
    <section aria-label={`${title}: ${members.length}`}>
      <h3 className="flex items-center gap-2 px-1 text-xs font-semibold text-[var(--app-muted)]">
        {title}
        <span className="font-mono text-xs font-normal">{members.length}</span>
      </h3>
      <div className="voople-group-people-list mt-1 divide-y divide-[var(--app-border)]">
        {members.map((member) => (
          <GroupPeopleRow
            key={member.id}
            member={member}
            online={onlineUserIds.has(member.id)}
            onOpenProfile={onOpenProfile}
            onVoop={member.id === currentUserId ? undefined : onVoop}
            vooping={voopingUserId === member.id}
            voopBusy={Boolean(voopingUserId)}
          />
        ))}
      </div>
    </section>
  );
}

function GroupPeopleRow({
  member,
  online,
  onOpenProfile,
  onVoop,
  vooping = false,
  voopBusy = false,
}: {
  member: ChatGroupMemberView;
  online: boolean;
  onOpenProfile?: (username: string) => void;
  onVoop?: (member: ChatGroupMemberView) => void;
  vooping?: boolean;
  voopBusy?: boolean;
}) {
  const status = member.activeRoom
    ? member.activeRoom.name
    : online
      ? "В сети"
      : "Не в сети";
  const content = (
    <>
      <GroupAvatar
        name={member.displayName}
        avatarUrl={member.avatarUrl}
        accentColor={member.roleColor}
        size="md"
        shape="square"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <strong className="truncate text-sm font-semibold text-[var(--foreground)]">
            {member.displayName}
          </strong>
          {member.activeRoom ? (
            <Radio
              className="h-3.5 w-3.5 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
          ) : online ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">
          @{member.username} · {roleLabels[member.role]}
        </span>
      </span>
      <span
        className={
          member.activeRoom
            ? "max-w-48 truncate text-right text-xs text-emerald-400"
            : "max-w-32 truncate text-right text-xs text-[var(--app-muted)]"
        }
      >
        {status}
      </span>
    </>
  );

  return (
    <div className="voople-group-people-row group flex min-w-0 items-center gap-2 px-2 py-1.5">
      {onOpenProfile ? (
        <button
          type="button"
          onClick={() => onOpenProfile(member.username)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2">{content}</div>
      )}
      {onVoop && online ? (
        <GroupPeopleVoopAction
          displayName={member.displayName}
          waiting={vooping}
          disabled={voopBusy && !vooping}
          onSelect={() => onVoop(member)}
        />
      ) : null}
    </div>
  );
}
