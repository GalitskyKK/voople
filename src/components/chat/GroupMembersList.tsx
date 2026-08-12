"use client";

import { Crown, Loader2, ShieldMinus, ShieldPlus, UserMinus } from "lucide-react";
import type { ReactNode } from "react";

import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

type Props = {
  members: ChatGroupMemberView[];
  renderAvatar: (user: UserSearchHit) => ReactNode;
  viewerRole: "owner" | "admin" | "member";
  removingMemberId: string | null;
  changingRoleMemberId: string | null;
  transferringOwnerMemberId: string | null;
  onChangeRole: (member: ChatGroupMemberView) => void;
  onTransferOwnership: (member: ChatGroupMemberView) => void;
  onRemoveMember: (member: ChatGroupMemberView) => void;
};

export function GroupMembersList({
  members,
  renderAvatar,
  viewerRole,
  removingMemberId,
  changingRoleMemberId,
  transferringOwnerMemberId,
  onChangeRole,
  onTransferOwnership,
  onRemoveMember,
}: Props) {
  return (
    <div className="voople-scroll mt-4 max-h-72 space-y-1 overflow-y-auto">
      {members.map((member) => {
        const canRemove = member.role !== "owner" && (
          viewerRole === "owner" || (viewerRole === "admin" && member.role === "member")
        );
        return (
          <div key={member.id} className="flex items-center gap-2 rounded-xl px-2 py-2">
            {renderAvatar(member)}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.displayName}</p>
              <p className="truncate text-xs text-[var(--app-muted)]">@{member.username}</p>
            </div>
            {member.role !== "member" ? (
              <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-1 text-[0.65rem] font-semibold text-(--theme-accent)">
                {member.role === "owner" ? "владелец" : "админ"}
              </span>
            ) : null}
            {viewerRole === "owner" && member.role !== "owner" ? (
              <button
                type="button"
                onClick={() => onTransferOwnership(member)}
                disabled={transferringOwnerMemberId === member.id}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-50"
                aria-label={`Передать владение группой пользователю ${member.displayName}`}
                title="Передать владение"
              >
                {transferringOwnerMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              </button>
            ) : null}
            {viewerRole === "owner" && member.role !== "owner" ? (
              <button
                type="button"
                onClick={() => onChangeRole(member)}
                disabled={changingRoleMemberId === member.id}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-(--theme-accent) disabled:opacity-50"
                aria-label={member.role === "admin" ? `Снять роль администратора с ${member.displayName}` : `Назначить ${member.displayName} администратором`}
                title={member.role === "admin" ? "Снять роль администратора" : "Назначить администратором"}
              >
                {changingRoleMemberId === member.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : member.role === "admin" ? (
                  <ShieldMinus className="h-4 w-4" />
                ) : (
                  <ShieldPlus className="h-4 w-4" />
                )}
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                onClick={() => onRemoveMember(member)}
                disabled={removingMemberId === member.id}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                aria-label={`Исключить ${member.displayName}`}
                title="Исключить из группы"
              >
                {removingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
