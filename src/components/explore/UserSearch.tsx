"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Hash, Search, UserRound } from "lucide-react";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";
import { TrendingHashtags } from "./TrendingHashtags";

function postPreview(post: {
  id: string;
  text?: string;
  repostComment?: string;
  createdAt: string;
  author: { username: string; displayName: string };
}) {
  return post.repostComment?.trim() || post.text?.trim() || "Пост";
}

export function UserSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching, error } = trpc.search.explore.useQuery(
    { q: debounced },
    { enabled: debounced.length >= 1, staleTime: 10_000 },
  );

  const hasQuery = debounced.length >= 1;
  const isEmpty =
    hasQuery &&
    !isFetching &&
    data &&
    data.users.length === 0 &&
    data.hashtags.length === 0 &&
    data.posts.length === 0;

  return (
    <div className="voople-user-search mt-6 space-y-6">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Люди, #хэштеги или текст поста"
          className="voople-input min-w-0 flex-1 py-2.5 pl-10 pr-3 text-sm"
        />
      </label>

      {!hasQuery && <TrendingHashtags />}

      {hasQuery && debounced.length < 2 && (
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">Для поиска постов введите минимум 2 символа</p>
      )}

      {isFetching && hasQuery && <div className="h-24 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />}

      {error && <p className="text-sm text-red-400">{error.message}</p>}

      {isEmpty && <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Ничего не найдено</p>}

      {data && hasQuery && !isFetching && (
        <div className="space-y-6">
          {data.hashtags.length > 0 && (
            <SearchSection title="Хэштеги" icon={Hash}>
              <ul className="space-y-2">
                {data.hashtags.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={`/hashtag/${encodeURIComponent(item.name)}`}
                      className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3 py-3 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[var(--foreground)]">
                        <Hash className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--foreground)]">#{item.name}</p>
                        <p className="truncate text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">{item.postCount} постов</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </SearchSection>
          )}

          {data.users.length > 0 && (
            <SearchSection title="Люди" icon={UserRound}>
              <ul className="space-y-2">
                {data.users.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${item.username}`}
                      className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3 py-3 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                    >
                      <ProfileAvatar displayName={item.displayName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <DisplayNameWithPin
                          hasVooplePlus={item.hasVooplePlus}
                          className="font-medium text-[var(--foreground)]"
                        >
                          {item.displayName}
                        </DisplayNameWithPin>
                        <p className="truncate text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">@{item.username}</p>
                        {item.bio && (
                          <p className="mt-1 line-clamp-1 text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">{item.bio}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </SearchSection>
          )}

          {data.posts.length > 0 && (
            <SearchSection title="Посты" icon={FileText}>
              <ul className="space-y-2">
                {data.posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/post/${post.id}`}
                      className="block rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3 py-3 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <ProfileAvatar displayName={post.author.displayName} size="sm" />
                        <div className="min-w-0">
                          <DisplayNameWithPin
                            hasVooplePlus={post.author.hasVooplePlus}
                            className="text-sm font-medium text-[var(--foreground)]"
                          >
                            {post.author.displayName}
                          </DisplayNameWithPin>
                          <RelativeTime iso={post.createdAt} className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]" />
                        </div>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">
                        {postPreview(post)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Hash;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">
        <Icon className="h-4 w-4 text-[var(--theme-accent)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}
