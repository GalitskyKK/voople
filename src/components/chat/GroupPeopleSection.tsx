import { Radio } from "lucide-react";

import { canVoopGroupMember } from "@/lib/chat/group-people";
import type { ChatGroupMemberView } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";
import { GroupPeopleVoopAction } from "./GroupPeopleVoopAction";

const roleLabels = { owner: "владелец", admin: "администратор", member: "участник" } as const;

export function GroupPeopleSection({ title, members, onlineUserIds, variant, onOpenProfile, currentUserId, currentParticipantIds, onVoop, voopingUserId }: {
  title: string;
  members: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  variant: "live" | "available" | "offline";
  onOpenProfile?: (username: string) => void;
  currentUserId?: string | null;
  currentParticipantIds: ReadonlySet<string>;
  onVoop?: (member: ChatGroupMemberView) => void;
  voopingUserId?: string | null;
}) {
  if (!members.length && variant !== "available") return null;
  return (
    <section aria-label={`${title}: ${members.length}`}>
      <h3 className="px-1 text-xs font-semibold text-[var(--app-muted)]">{title} <span className="ml-1 font-normal">{members.length}</span></h3>
      {members.length ? (
        <div className="voople-group-people-list mt-2 flex flex-wrap gap-2">
          {members.map((member) => (
            <GroupPeopleRow
              key={member.id}
              member={member}
              variant={variant}
              online={variant === "available" || onlineUserIds.has(member.id)}
              onOpenProfile={onOpenProfile}
              onVoop={variant === "live" && onVoop && canVoopGroupMember(member, currentUserId, currentParticipantIds) ? onVoop : undefined}
              vooping={voopingUserId === member.id}
              voopBusy={Boolean(voopingUserId)}
            />
          ))}
        </div>
      ) : <p className="mt-2 px-1 text-xs text-[var(--app-muted)]">Все участники уже в голосе или не в сети.</p>}
    </section>
  );
}

function GroupPeopleRow({ member, variant, online, onOpenProfile, onVoop, vooping = false, voopBusy = false }: {
  member: ChatGroupMemberView;
  variant: "live" | "available" | "offline";
  online: boolean;
  onOpenProfile?: (username: string) => void;
  onVoop?: (member: ChatGroupMemberView) => void;
  vooping?: boolean;
  voopBusy?: boolean;
}) {
  const content = (
    <>
      <GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl} accentColor={member.roleColor} size="sm" shape="square" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <strong className="truncate text-sm font-semibold text-[var(--foreground)]">{member.displayName}</strong>
          {variant === "live" ? <Radio className="h-3 w-3 shrink-0 text-[var(--voople-ice)]" aria-label="В голосе" /> : online ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--material-presence)]" aria-label="В сети" /> : null}
        </span>
        <span className="block truncate text-xs text-[var(--app-muted)]">@{member.username}{variant !== "offline" && member.role !== "member" ? ` · ${roleLabels[member.role]}` : ""}</span>
      </span>
    </>
  );
  return (
    <div className={`voople-group-people-row group flex min-h-12 w-full max-w-[360px] items-center gap-2 rounded-xl px-2 ${variant === "offline" ? "opacity-70" : "bg-[var(--material-control-fill)]"}`}>
      {onOpenProfile ? (
        <button type="button" onClick={() => onOpenProfile(member.username)} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]">{content}</button>
      ) : <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2">{content}</div>}
      {onVoop ? <GroupPeopleVoopAction displayName={member.displayName} waiting={vooping} disabled={voopBusy && !vooping} onSelect={() => onVoop(member)} /> : null}
    </div>
  );
}
