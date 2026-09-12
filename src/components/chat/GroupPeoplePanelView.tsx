import { Radio, RefreshCw, UsersRound } from "lucide-react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
import type { ChatGroupMemberView } from "@/types/chat";

type GroupPeoplePanelViewProps = {
  members?: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onOpenProfile?: (username: string) => void;
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
  onRetry,
  onOpenProfile,
}: GroupPeoplePanelViewProps) {
  if (loading && !members) {
    return <div className="mr-auto h-48 w-full max-w-[760px] animate-pulse border-y border-[var(--app-border)] bg-[var(--app-surface-soft)]" aria-label="Загружаем участников" />;
  }

  if (error && !members) {
    return (
      <div className="mr-auto flex min-h-56 w-full max-w-[760px] flex-col items-center justify-center gap-3 px-5 text-center" role="alert">
        <p className="text-sm font-medium">Не удалось загрузить участников</p>
        <p className="max-w-md text-xs leading-5 text-[var(--app-muted)]">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center gap-2 border border-[var(--app-border)] px-3 text-xs font-semibold hover:bg-[var(--app-surface-soft)]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Повторить
        </button>
      </div>
    );
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
    <section className="voople-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" aria-labelledby="group-people-title">
      <div className="mr-auto w-full max-w-[760px]">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--app-border)] pb-3">
          <div>
            <h2 id="group-people-title" className="text-sm font-semibold uppercase tracking-[0.08em]">Люди</h2>
            <p className="mt-1 text-xs text-[var(--app-muted)]">{liveCount} в разговоре · {onlineCount} в сети</p>
          </div>
          <span className="font-mono text-[11px] text-[var(--app-muted)]">{sorted.length} всего</span>
        </header>

        <div className="space-y-5 pt-4">
          <GroupPeopleSection
            title="В разговоре"
            members={liveMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
          />
          <GroupPeopleSection
            title="Онлайн"
            members={onlineMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
          />
          <GroupPeopleSection
            title="Остальные"
            members={offlineMembers}
            onlineUserIds={onlineUserIds}
            onOpenProfile={onOpenProfile}
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
}: {
  title: string;
  members: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  onOpenProfile?: (username: string) => void;
}) {
  if (!members.length) return null;

  return (
    <section aria-label={`${title}: ${members.length}`}>
      <h3 className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
        {title}
        <span className="font-mono text-[9px] font-normal">{members.length}</span>
      </h3>
      <div className="mt-1 divide-y divide-[var(--app-border)]">
        {members.map((member) => (
          <GroupPeopleRow
            key={member.id}
            member={member}
            online={onlineUserIds.has(member.id)}
            onOpenProfile={onOpenProfile}
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
}: {
  member: ChatGroupMemberView;
  online: boolean;
  onOpenProfile?: (username: string) => void;
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
          <strong className="truncate text-sm font-semibold">
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

  return onOpenProfile ? (
    <button
      type="button"
      onClick={() => onOpenProfile(member.username)}
      className="flex w-full items-center gap-3 rounded-[var(--app-radius-sm)] px-1 py-2.5 text-left transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]"
    >
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 px-1 py-2.5">{content}</div>
  );
}
