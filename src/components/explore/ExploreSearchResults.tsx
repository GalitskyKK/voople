import { FileText, Hash, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { PostAuthorView } from "@/types/domain";
import type { ExploreSearchResult } from "@/types/search";

export type ExploreAvatarRenderer = (props: {
  author: PostAuthorView;
}) => ReactNode;

export function ExploreSearchResults({
  result,
  renderDestination,
  renderAvatar,
  badgeUrl,
}: {
  result: ExploreSearchResult;
  renderDestination: NavigationDestinationRenderer;
  renderAvatar: ExploreAvatarRenderer;
  badgeUrl?: string;
}) {
  const itemClass =
    "flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3 py-3 text-left hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]";

  return (
    <div className="space-y-6">
      {result.hashtags.length > 0 && (
        <ResultSection title="Хэштеги" icon={<Hash />}>
          <ul className="space-y-2">
            {result.hashtags.map((item) => (
              <li key={item.name}>
                {renderDestination({
                  href: `/hashtag/${encodeURIComponent(item.name)}`,
                  label: `Хэштег ${item.name}`,
                  active: false,
                  className: itemClass,
                  children: (
                    <>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                        <Hash className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">#{item.name}</p>
                        <p className="truncate text-sm text-[var(--app-muted)]">
                          {item.postCount} постов
                        </p>
                      </div>
                    </>
                  ),
                })}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}
      {result.users.length > 0 && (
        <ResultSection title="Люди" icon={<UserRound />}>
          <ul className="space-y-2">
            {result.users.map((item) => (
              <li key={item.id}>
                {renderDestination({
                  href: `/${item.username}`,
                  label: item.displayName,
                  active: false,
                  className: itemClass,
                  children: (
                    <>
                      {renderAvatar({
                        author: {
                          username: item.username,
                          displayName: item.displayName,
                          hasVooplePlus: item.hasVooplePlus,
                          avatarUrl: item.avatarUrl ?? undefined,
                        },
                      })}
                      <div className="min-w-0 flex-1">
                        <DisplayNameWithPin
                          hasVooplePlus={item.hasVooplePlus}
                          badgeUrl={badgeUrl}
                          className="font-medium"
                        >
                          {item.displayName}
                        </DisplayNameWithPin>
                        <p className="truncate text-sm text-[var(--app-muted)]">
                          @{item.username}
                        </p>
                        {item.bio && (
                          <p className="mt-1 line-clamp-1 text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
                            {item.bio}
                          </p>
                        )}
                      </div>
                    </>
                  ),
                })}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}
      {result.posts.length > 0 && (
        <ResultSection title="Посты" icon={<FileText />}>
          <ul className="space-y-2">
            {result.posts.map((post) => (
              <li key={post.id}>
                {renderDestination({
                  href: `/post/${post.id}`,
                  label: `Пост ${post.author.displayName}`,
                  active: false,
                  className: `${itemClass} items-start`,
                  children: (
                    <>
                      {renderAvatar({ author: post.author })}
                      <div className="min-w-0 flex-1">
                        <DisplayNameWithPin
                          hasVooplePlus={post.author.hasVooplePlus}
                          badgeUrl={badgeUrl}
                          className="text-sm font-medium"
                        >
                          {post.author.displayName}
                        </DisplayNameWithPin>
                        <RelativeTime
                          iso={post.createdAt}
                          className="ml-2 text-xs text-[var(--app-muted)]"
                        />
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">
                          {post.repostComment?.trim() ||
                            post.text?.trim() ||
                            "Пост"}
                        </p>
                      </div>
                    </>
                  ),
                })}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_80%,transparent)] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-[var(--theme-accent)]">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
