"use client";

import Link from "next/link";
import { Hash } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function TrendingHashtags() {
  const { data = [], isLoading, error } = trpc.search.trendingHashtags.useQuery(
    { limit: 10 },
    { staleTime: 60_000 },
  );

  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-xl bg-white/5" />;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error.message}</p>;
  }

  if (data.length === 0) {
    return <p className="text-sm text-white/40">Пока нет популярных хэштегов</p>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-white">Трендовые хэштеги</h2>
      <ul className="flex flex-wrap gap-2">
        {data.map((hashtag) => (
          <li key={hashtag.name}>
            <Link
              href={`/hashtag/${encodeURIComponent(hashtag.name)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5 text-sm text-[color-mix(in_srgb,var(--foreground)_88%,transparent)] transition-all duration-200 hover:border-[var(--app-border-strong)] hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_75%,white)]"
            >
              <Hash className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span>{hashtag.name}</span>
              <span className="text-xs text-white/45">{hashtag.postCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
