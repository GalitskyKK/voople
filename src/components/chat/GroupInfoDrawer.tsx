"use client";

import { Info, Settings2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RichText } from "@/components/ui/RichText";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { GroupAvatar } from "./GroupAvatar";
import { GroupIdentity } from "./GroupManagementTrigger";

type DrawerTab = "info" | "members";

export function GroupInfoDrawer({
  chatId,
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupBannerUrl,
  groupAccentColor,
  groupTag,
  canManage,
}: {
  chatId: string;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("info");
  const community = trpc.chat.groupCommunity.useQuery({ chatId }, { enabled: open });
  const members = trpc.chat.groupMembers.useQuery({ chatId }, { enabled: open && tab === "members" });

  const show = (next: DrawerTab) => {
    setTab(next);
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={() => show("info")} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]" aria-label={`Информация о группе ${chatName}`}>
        <GroupIdentity chatName={chatName} memberCount={memberCount} groupIcon={groupIcon} groupAvatarUrl={groupAvatarUrl} groupAccentColor={groupAccentColor} groupTag={groupTag} />
      </button>
      <button type="button" onClick={() => show("members")} className="hidden h-9 w-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] sm:inline-flex" aria-label="Участники группы" title="Участники">
        <UsersRound className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => show("info")} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]" aria-label="Информация о группе" title="Информация">
        <Info className="h-4 w-4" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} placement="right" ariaLabel={`Информация о группе ${chatName}`}>
        <div className="-mx-5 -mt-5">
          <div className="h-36 bg-[var(--app-accent-soft)] bg-cover bg-center" style={groupBannerUrl ? { backgroundImage: `url("${groupBannerUrl}")` } : undefined} />
          <div className="px-5">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" />
              {canManage ? (
                <Link href={`/messages/${chatId}/settings`} onClick={() => setOpen(false)} className="mb-1 inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-medium hover:bg-[var(--app-surface-soft)]">
                  <Settings2 className="h-4 w-4" /> Настройки
                </Link>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold">{chatName}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{memberCount} участников{groupTag ? ` · ${groupTag}` : ""}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--app-surface-soft)] p-1">
          {([ ["info", "О группе"], ["members", "Участники"] ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn("rounded-lg px-3 py-2 text-sm transition", tab === id ? "bg-[var(--app-surface)] font-medium shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)]")} aria-current={tab === id ? "page" : undefined}>{label}</button>
          ))}
        </div>

        {tab === "info" ? (
          <div className="mt-5 text-sm leading-6 text-[var(--app-muted)]">
            {community.isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : community.data?.description ? <RichText text={community.data.description} /> : <p>Описание сообщества пока не добавлено.</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {members.isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : members.data?.map((member) => (
              <Link key={member.id} href={`/${member.username}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--app-surface-soft)]">
                <GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{member.displayName}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{member.username} · {member.role === "owner" ? "владелец" : member.role === "admin" ? "администратор" : "участник"}</span></span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
