import { ArrowRight, FileText, Hash, UsersRound, UserRound } from "lucide-react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import type { ExploreHighlights, HashtagSearchHit } from "@/types/search";

import type { ExploreAvatarRenderer } from "./ExploreSearchResults";

type Scope = "all" | "people" | "posts" | "communities";

export function ExploreHighlightsView({
  highlights,
  trending,
  scope,
  renderDestination,
  renderAvatar,
  badgeUrl,
}: {
  highlights: ExploreHighlights;
  trending: HashtagSearchHit[];
  scope: Scope;
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: ExploreAvatarRenderer;
  badgeUrl?: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {(scope === "all" || scope === "people") && highlights.users.length ? (
        <section className="min-w-0 xl:col-span-2" aria-labelledby="popular-people-title">
          <SectionTitle id="popular-people-title" icon={<UserRound />} title="Люди" />
          <ul className="voople-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
            {highlights.users.map((user) => (
              <li key={user.id} className="min-w-[7.5rem] flex-1">
                {renderDestination({
                  href: `/${user.username}`,
                  label: user.displayName,
                  active: false,
                  className: "group flex h-full flex-col items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-accent)_38%,var(--app-border))] hover:shadow-[var(--app-shadow-sm)]",
                  children: <>
                    {renderAvatar({ author: { id: user.id, username: user.username, displayName: user.displayName, hasVooplePlus: user.hasVooplePlus, avatarUrl: user.avatarUrl ?? undefined } })}
                    <DisplayNameWithPin hasVooplePlus={user.hasVooplePlus} badgeUrl={badgeUrl} className="mt-2 max-w-full truncate text-sm font-semibold">{user.displayName}</DisplayNameWithPin>
                    <span className="max-w-full truncate text-xs text-[var(--app-muted)]">@{user.username}</span>
                  </>,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(scope === "all" || scope === "posts") && highlights.posts.length ? (
        <section className={scope === "posts" ? "min-w-0 xl:col-span-2" : "min-w-0"} aria-labelledby="popular-posts-title">
          <SectionTitle id="popular-posts-title" icon={<FileText />} title="Популярные посты" />
          <ul className={scope === "posts" ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-3 grid gap-2"}>
            {highlights.posts.slice(0, 4).map((post) => (
              <li key={post.id}>
                {renderDestination({
                  href: `/post/${post.id}`,
                  label: `Пост ${post.author.displayName}`,
                  active: false,
                  className: "group flex min-h-28 gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 transition hover:border-[color-mix(in_srgb,var(--theme-accent)_32%,var(--app-border))] hover:bg-[var(--app-surface-soft)]",
                  children: <>
                    {renderAvatar({ author: post.author })}
                    <span className="min-w-0 flex-1">
                      <DisplayNameWithPin hasVooplePlus={post.author.hasVooplePlus} badgeUrl={badgeUrl} className="text-sm font-semibold">{post.author.displayName}</DisplayNameWithPin>
                      <span className="mt-1.5 line-clamp-3 block text-sm leading-5 text-[color-mix(in_srgb,var(--foreground)_78%,transparent)]">{post.repostComment?.trim() || post.text?.trim() || "Публикация с медиа"}</span>
                    </span>
                  </>,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(scope === "all" || scope === "communities") && highlights.communities.length ? (
        <section className={scope === "communities" ? "min-w-0 xl:col-span-2" : "min-w-0"} aria-labelledby="popular-groups-title">
          <SectionTitle id="popular-groups-title" icon={<UsersRound />} title="Открытые сообщества" />
          <ul className={scope === "communities" ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-3 grid gap-2"}>
            {highlights.communities.slice(0, 4).map((group) => (
              <li key={group.id}>
                {renderDestination({
                  href: group.publicSlug ? `/group/${group.publicSlug}` : `/messages/${group.id}`,
                  label: group.name,
                  active: false,
                  className: "group flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 transition hover:border-[color-mix(in_srgb,var(--theme-accent)_32%,var(--app-border))] hover:bg-[var(--app-surface-soft)]",
                  children: <>
                    <GroupAvatar name={group.name} avatarUrl={group.avatarUrl} icon={group.icon} accentColor={null} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="block truncate text-xs text-[var(--app-muted)]">{group.memberCount} участников</span></span>
                    <ArrowRight className="h-4 w-4 text-[var(--theme-accent)] opacity-0 transition group-hover:opacity-100" />
                  </>,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {scope === "all" && trending.length ? (
        <section className="min-w-0 xl:col-span-2" aria-labelledby="popular-topics-title">
          <SectionTitle id="popular-topics-title" icon={<Hash />} title="Темы" />
          <ul className="mt-3 flex flex-wrap gap-2">
            {trending.slice(0, 6).map((item) => <li key={item.name}>{renderDestination({ href: `/hashtag/${encodeURIComponent(item.name)}`, label: `#${item.name}`, active: false, className: "inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm transition hover:border-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]", children: <><span className="text-[var(--theme-accent)]">#</span>{item.name}<span className="text-xs text-[var(--app-muted)]">{item.postCount}</span></> })}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return <h2 id={id} className="flex items-center gap-2 text-sm font-semibold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-[var(--theme-accent)]">{icon}{title}</h2>;
}
