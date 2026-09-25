"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { UsersRound } from "lucide-react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileFriendAction } from "@/components/profile/ProfileFriendAction";
import { ProfileMessageAction } from "@/components/profile/ProfileMessageAction";
import { trpc } from "@/lib/trpc/client";
import type { PublicGroupSearchHit } from "@/types/chat";
import type { BetaSearchPerson } from "@/types/search";

const rowClass = "flex min-w-0 items-center gap-3 rounded-[var(--material-control-radius)] p-3 transition-colors hover:bg-[var(--material-control-fill)]";

export function BetaSearchResults({ people, groups, scope, renderDestination, renderAvatar, onNavigate }: {
  people: BetaSearchPerson[];
  groups: PublicGroupSearchHit[];
  scope: "all" | "people" | "groups";
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: (person: BetaSearchPerson) => ReactNode;
  onNavigate: (href: string) => void;
}) {
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const join = trpc.chat.joinPublicGroup.useMutation({
    onSuccess: (result, input) => {
      if (result.status === "joined") onNavigate(`/messages/${result.chatId}`);
      else setRequestedIds((current) => new Set(current).add(input.chatId));
    },
  });

  return <div className="space-y-6">
    {(scope === "all" || scope === "people") && people.length > 0 ? <section aria-labelledby="search-people-title">
      <h2 id="search-people-title" className="mb-2 text-sm font-semibold">Люди</h2>
      <ul className="divide-y divide-[var(--material-border)]">{people.map((person) => <li key={person.id} className={`${rowClass} flex-wrap`}>
        {renderAvatar(person)}
        <div className="min-w-0 flex-1">
          {renderDestination({ href: `/${person.username}`, label: `Профиль ${person.displayName}`, active: false,
            className: "block min-w-0 rounded-md font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]",
            children: <span className="truncate">{person.displayName}</span>,
          })}
          <p className="truncate text-xs text-[var(--material-secondary-text)]">@{person.username}{person.online ? " · В сети" : ""}</p>
          {person.commonGroups.count > 0 ? <p className="truncate text-xs text-[var(--material-secondary-text)]" title={person.commonGroups.groups.map((group) => group.name).join(", ")}>
            Общие группы: {person.commonGroups.count}{person.commonGroups.groups.length ? ` · ${person.commonGroups.groups.map((group) => group.name).join(", ")}` : ""}
          </p> : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:basis-full max-sm:pl-11">
          <ProfileFriendAction userId={person.id} />
          {person.canMessage ? <ProfileMessageAction username={person.username} size="sm" onNavigate={onNavigate} /> : null}
        </div>
      </li>)}</ul>
    </section> : null}
    {(scope === "all" || scope === "groups") && groups.length > 0 ? <section aria-labelledby="search-groups-title">
      <h2 id="search-groups-title" className="mb-2 text-sm font-semibold">Публичные группы</h2>
      <ul className="divide-y divide-[var(--material-border)]">{groups.map((group) => {
        const pending = group.joinRequestPending || requestedIds.has(group.id);
        return <li key={group.id} className={rowClass}>
          <GroupAvatar name={group.name} avatarUrl={group.avatarUrl} icon={group.icon} accentColor={null} size="md" />
          <div className="min-w-0 flex-1">
            {group.joined || group.publicSlug ? renderDestination({ href: group.joined ? `/messages/${group.id}` : `/group/${group.publicSlug}`,
              label: `Группа ${group.name}`, active: false, className: "block truncate rounded-md font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]", children: group.name }) : <p className="truncate font-semibold">{group.name}</p>}
            <p className="truncate text-xs text-[var(--material-secondary-text)]">{group.publicSlug ? `@${group.publicSlug} · ` : ""}{group.tag ? `${group.tag} · ` : ""}<UsersRound className="mr-1 inline h-3 w-3" />{group.memberCount} участников</p>
            {group.description ? <p className="line-clamp-1 text-xs text-[var(--material-secondary-text)]">{group.description}</p> : null}
          </div>
          {group.joined ? renderDestination({ href: `/messages/${group.id}`, label: `Открыть ${group.name}`, active: false,
            className: "grid min-h-10 shrink-0 place-items-center rounded-[var(--material-control-radius)] border border-[var(--material-border)] px-3 text-xs font-medium hover:bg-[var(--material-interactive-fill)]", children: "Открыть" }) :
            <button type="button" className="min-h-10 shrink-0 rounded-[var(--material-control-radius)] border border-[var(--material-border)] px-3 text-xs font-medium hover:bg-[var(--material-interactive-fill)] disabled:opacity-50"
              disabled={pending || group.joinPolicy === "invite_only" || join.isPending}
              onClick={() => join.mutate({ chatId: group.id })}>
              {pending ? "Заявка отправлена" : group.joinPolicy === "invite_only" ? "По приглашению" : group.joinPolicy === "request" ? "Подать заявку" : "Вступить"}
            </button>}
        </li>;
      })}</ul>
      {join.error ? <p role="alert" className="mt-2 text-sm text-[var(--voople-danger)]">{join.error.message}</p> : null}
    </section> : null}
  </div>;
}
