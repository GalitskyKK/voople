import type { Session } from "@supabase/supabase-js";
import { Hash } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";

import type { DesktopConfig } from "../config";
import { DesktopPostCard } from "./DesktopPostCard";
import { useDesktopHashtagFeed } from "./useDesktopHashtagFeed";

export function DesktopHashtagFeed({
  config,
  session,
  tag,
  renderDestination,
}: {
  config: DesktopConfig;
  session: Session;
  tag: string;
  renderDestination: NavigationDestinationRenderer;
}) {
  const feed = useDesktopHashtagFeed(config, session, tag);

  return (
    <div className="desktop-section-content">
      <header className="voople-panel mb-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
            <Hash className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">#{tag}</h1>
            <p className="text-sm text-[var(--app-muted)]">Посты с этим хэштегом</p>
          </div>
        </div>
      </header>
      {feed.loading ? <div className="feed-skeleton" aria-label="Загрузка ленты" /> : null}
      {feed.error ? (
        <div className="feed-message" role="alert">
          <p>{feed.error}</p>
          <button type="button" onClick={feed.retry}>Повторить</button>
        </div>
      ) : null}
      {!feed.loading && !feed.error && feed.items.length === 0 ? (
        <div className="feed-message">Пока нет постов с этим хэштегом.</div>
      ) : null}
      <div className="post-list">
        {feed.items.map((post) => (
          <DesktopPostCard
            key={post.id}
            post={post}
            config={config}
            session={session}
            renderDestination={renderDestination}
          />
        ))}
      </div>
      {feed.loadMore ? (
        <button type="button" className="load-more" disabled={feed.loadingMore} onClick={feed.loadMore}>
          {feed.loadingMore ? "Загружаем…" : "Показать ещё"}
        </button>
      ) : null}
    </div>
  );
}
