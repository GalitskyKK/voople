"use client";

import { Loader2, UserMinus } from "lucide-react";
import type { ReactNode } from "react";

import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

export function GroupMembersList({
  members,
  renderAvatar,
  viewerRole,
  removingMemberId,
  onRemoveMember,
}: {
  members: ChatGroupMemberView[];
  renderAvatar: (user: UserSearchHit) => ReactNode;
  viewerRole: "owner" | "admin" | "member";
  removingMemberId: string | null;
  onRemoveMember: (member: ChatGroupMemberView) => void;
}) {
  return (
    <div className="voople-scroll mt-4 max-h-72 space-y-1 overflow-y-auto">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
          {renderAvatar(member)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{member.displayName}</p>
            <p className="truncate text-xs text-[var(--app-muted)]">@{member.username}</p>
          </div>
          {member.role !== "member" ? (
            <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-1 text-[0.65rem] font-semibold text-(--theme-accent)">{member.role === "owner" ? "владелец" : "админ"}</span>
          ) : null}
          {member.role !== "owner" && (viewerRole === "owner" || (viewerRole === "admin" && member.role === "member")) ? (
            <button type="button" onClick={() => onRemoveMember(member)} disabled={removingMemberId === member.id} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label={`Исключить ${member.displayName}`} title="Исключить из группы">
              {removingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
