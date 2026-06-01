"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Hash, Search, UserRound } from "lucide-react";

import { RelativeTime } from "@/components/ui/RelativeTime";
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Люди, #хэштеги или текст поста"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--theme-accent,#7B3AED)]/50"
        />
      </label>

      {!hasQuery && <TrendingHashtags />}

      {hasQuery && debounced.length < 2 && (
        <p className="text-sm text-white/40">Для поиска постов введите минимум 2 символа</p>
      )}

      {isFetching && hasQuery && <div className="h-24 animate-pulse rounded-xl bg-white/5" />}

      {error && <p className="text-sm text-red-400">{error.message}</p>}

      {isEmpty && <p className="text-sm text-white/50">Ничего не найдено</p>}

      {data && hasQuery && !isFetching && (
        <div className="space-y-6">
          {data.hashtags.length > 0 && (
            <SearchSection title="Хэштеги" icon={Hash}>
              <ul className="space-y-2">
                {data.hashtags.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={`/hashtag/${encodeURIComponent(item.name)}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-3 py-3 hover:bg-white/5"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                        <Hash className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">#{item.name}</p>
                        <p className="truncate text-sm text-white/50">{item.postCount} постов</p>
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
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-3 py-3 hover:bg-white/5"
                    >
                      <ProfileAvatar displayName={item.displayName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{item.displayName}</p>
                        <p className="truncate text-sm text-white/50">@{item.username}</p>
                        {item.bio && (
                          <p className="mt-1 line-clamp-1 text-xs text-white/40">{item.bio}</p>
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
                      className="block rounded-xl border border-white/10 bg-white/3 px-3 py-3 hover:bg-white/5"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <ProfileAvatar displayName={post.author.displayName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {post.author.displayName}
                          </p>
                          <RelativeTime iso={post.createdAt} className="text-xs text-white/45" />
                        </div>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-white/85">
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
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80">
        <Icon className="h-4 w-4 text-[var(--theme-accent,#7B3AED)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}
