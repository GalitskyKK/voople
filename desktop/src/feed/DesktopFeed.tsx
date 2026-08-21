import type { Session } from "@supabase/supabase-js";
import { useState } from "react";

import { FeedHeaderVisual } from "@/components/layout/FeedHeaderVisual";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { HomeNowPanelView, HomeSecondaryRailView } from "@/components/home/HomeOverviewPanelsView";

import type { DesktopConfig } from "../config";
import { DesktopPostCard } from "./DesktopPostCard";
import type { DesktopFeedTab } from "./types";
import { useDesktopFeed } from "./useDesktopFeed";
import { useDesktopHomeOverview } from "./useDesktopHomeOverview";

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
  const home = useDesktopHomeOverview(config, session);

  return (
    <>
      <FeedHeaderVisual activeTab={tab} onTabChange={setTab} />
      <AppPageContent className="feed-layout py-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)]">
          <div className="min-w-0">
            {home.loading ? <div className="mb-4 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" aria-label="Загрузка актуальной активности" /> : <HomeNowPanelView overview={home.overview} renderDestination={renderDestination} />}
            {home.error ? <div className="feed-message" role="alert"><p>{home.error}</p><button type="button" onClick={home.retry}>Повторить</button></div> : null}
            {feed.loading && <div className="feed-skeleton" aria-label="Загрузка ленты" />}
            {feed.error && <div className="feed-message" role="alert"><p>{feed.error}</p><button type="button" onClick={feed.retry}>Повторить</button></div>}
            {!feed.loading && !feed.error && feed.items.length === 0 && <div className="feed-message">{tab === "following" ? "Подпишитесь на авторов — их публикации появятся здесь." : "Лента пока пуста."}</div>}
            <div className="post-list">{feed.items.map((post) => <DesktopPostCard post={post} config={config} session={session} renderDestination={renderDestination} key={post.id} />)}</div>
            {feed.loadMore && <button type="button" className="load-more" disabled={feed.loadingMore} onClick={feed.loadMore}>{feed.loadingMore ? "Загружаем…" : "Показать ещё"}</button>}
          </div>
          {!home.loading && !home.error ? <HomeSecondaryRailView overview={home.overview} renderDestination={renderDestination} /> : null}
        </div>
      </AppPageContent>
    </>
  );
}
