import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo, useState } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { HomeFeedLayoutView } from "@/components/home/HomeFeedLayoutView";
import { HomeNowConnectedPanel } from "@/components/home/HomeNowConnectedPanel";
import { useHomeActiveRooms } from "@/hooks/useHomeActiveRooms";
import {
  HomeSecondaryRailView,
} from "@/components/home/HomeOverviewPanelsView";

import type { DesktopConfig } from "../config";
import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopFeedTab } from "../feed/types";
import { useDesktopFeed } from "../feed/useDesktopFeed";
import { useDesktopHomeOverview } from "../feed/useDesktopHomeOverview";
import { DesktopPostCardAdapter } from "./DesktopPostCardAdapter";

export function DesktopFeedAdapter({
  config,
  session,
  renderDestination,
  navigate,
  tab,
}: {
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
  navigate: (href: string) => void;
  tab: DesktopFeedTab;
}) {
  const feed = useDesktopFeed(config, session, tab);
  const home = useDesktopHomeOverview(config, session);
  const liveHome = useHomeActiveRooms(home.overview);
  const [messagingUsername, setMessagingUsername] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const messageUser = useCallback(async (username: string) => {
    setMessagingUsername(username);
    setMessageError(null);
    try {
      const result = await client.mutation("chat.openDirect", { username }) as { chatId: string };
      navigate(`/messages/${result.chatId}`);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Не удалось открыть диалог");
    } finally {
      setMessagingUsername(null);
    }
  }, [client, navigate]);

  return (
    <AppPageContent className="py-4">
      <HomeFeedLayoutView
        primary={
          <>
            {home.loading ? (
              <div
                className="mb-4 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]"
                aria-label="Загрузка актуальной активности"
              />
            ) : (
              <HomeNowConnectedPanel
                overview={liveHome.overview}
                renderDestination={renderDestination}
                onMessageUser={(username) => void messageUser(username)}
                messagingUsername={messagingUsername}
                messageError={messageError}
                refreshing={liveHome.refreshing}
                refreshPaused={liveHome.paused}
                refreshError={liveHome.error}
                onRetryRefresh={() => void liveHome.retry()}
              />
            )}
            {home.error ? (
              <div className="feed-message" role="alert">
                <p>{home.error}</p>
                <button type="button" onClick={home.retry}>Повторить</button>
              </div>
            ) : null}
            {feed.loading ? <div className="feed-skeleton" aria-label="Загрузка ленты" /> : null}
            {feed.error ? (
              <div className="feed-message" role="alert">
                <p>{feed.error}</p>
                <button type="button" onClick={feed.retry}>Повторить</button>
              </div>
            ) : null}
            {!feed.loading && !feed.error && feed.items.length === 0 ? (
              <div className="feed-message">
                {tab === "following"
                  ? "Подпишитесь на авторов — их публикации появятся здесь."
                  : "Лента пока пуста."}
              </div>
            ) : null}
            <div className="post-list">
              {feed.items.map((post) => (
                <DesktopPostCardAdapter
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
          </>
        }
        secondary={
          !home.loading && !home.error ? (
            <HomeSecondaryRailView overview={liveHome.overview} renderDestination={renderDestination} />
          ) : null
        }
      />
    </AppPageContent>
  );
}
