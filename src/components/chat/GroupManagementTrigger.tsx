"use client";

import { UsersRound } from "lucide-react";

import { GroupAvatar } from "./GroupAvatar";

type GroupIdentityProps = {
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
};

export function GroupIdentity({
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupAccentColor,
  groupTag,
}: GroupIdentityProps) {
  return (
    <>
      <GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="block min-w-0 truncate font-semibold">{chatName}</span>
          {groupTag ? <span className="shrink-0 rounded bg-[var(--app-accent-soft)] px-1 py-0.5 text-[9px] font-bold tracking-wide text-[var(--theme-accent)]">{groupTag}</span> : null}
        </span>
        <span className="block truncate text-xs font-normal text-[var(--app-muted)]">{memberCount} участников</span>
      </span>
    </>
  );
}

export function GroupManagementTrigger({
  variant,
  onClick,
  ...identity
}: GroupIdentityProps & {
  variant: "toolbar" | "identity";
  onClick: () => void;
}) {
  const identityVariant = variant === "identity";
  return (
    <button
      type="button"
      onClick={onClick}
      className={identityVariant
        ? "flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
        : "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] px-2.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"}
      aria-label={identityVariant ? `Информация о группе ${identity.chatName}` : "Участники и разделы"}
      title={identityVariant ? "Открыть информацию о группе" : "Участники и разделы"}
    >
      {identityVariant ? (
        <GroupIdentity {...identity} />
      ) : (
        <><UsersRound className="h-4 w-4" /><span className="hidden text-xs font-medium md:inline">Участники и разделы</span></>
      )}
    </button>
  );
}
