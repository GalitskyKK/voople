import type { Session } from "@supabase/supabase-js";
import { useState } from "react";

import { FeedHeaderVisual } from "@/components/layout/FeedHeaderVisual";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";

import type { DesktopConfig } from "../config";
import { DesktopPostCard } from "./DesktopPostCard";
import type { DesktopFeedTab } from "./types";
import { useDesktopFeed } from "./useDesktopFeed";

export function DesktopFeed({
  config,
  session,
  renderDestination,
}: {
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
}) {
  const [tab, setTab] = useState<DesktopFeedTab>("overview");
  const feed = useDesktopFeed(config, session, tab);

  return (
    <>
      <FeedHeaderVisual activeTab={tab} onTabChange={setTab} />
      <div className="feed-layout desktop-section-content">
        {feed.loading && (
          <div className="feed-skeleton" aria-label="Загрузка ленты" />
        )}
        {feed.error && (
          <div className="feed-message" role="alert">
            <p>{feed.error}</p>
            <button type="button" onClick={feed.retry}>
              Повторить
            </button>
          </div>
        )}
        {!feed.loading && !feed.error && feed.items.length === 0 && (
          <div className="feed-message">
            {tab === "following"
              ? "Подпишитесь на авторов — их публикации появятся здесь."
              : "Лента пока пуста."}
          </div>
        )}
        <div className="post-list">
          {feed.items.map((post) => (
            <DesktopPostCard
              post={post}
              config={config}
              session={session}
              renderDestination={renderDestination}
              key={post.id}
            />
          ))}
        </div>
        {feed.loadMore && (
          <button
            type="button"
            className="load-more"
            disabled={feed.loadingMore}
            onClick={feed.loadMore}
          >
            {feed.loadingMore ? "Загружаем…" : "Показать ещё"}
          </button>
        )}
      </div>
    </>
  );
}
