import type { Session } from "@supabase/supabase-js";
import { HashtagPageHeader } from "@/components/feed/HashtagPageHeader";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";

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
    <AppPageContent className="py-4 lg:py-6">
      <div className="mb-4"><HashtagPageHeader tag={tag} /></div>
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
    </AppPageContent>
  );
}
