import type { Session } from "@supabase/supabase-js";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ExploreView } from "@/components/explore/ExploreView";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import { resolveRingStyle } from "@/lib/customization/rings";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { PostAuthorView } from "@/types/domain";

import type { DesktopConfig } from "../config";
import { useDesktopExplore } from "../explore/useDesktopExplore";

export function DesktopExploreAdapter({
  config,
  session,
  renderDestination,
}: {
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
}) {
  const { query, setQuery, debouncedQuery } = useDebouncedSearchQuery();
  const explore = useDesktopExplore(config, session, debouncedQuery);

  return (
    <AppPageContent>
      <ExploreView
        query={query}
        debouncedQuery={debouncedQuery}
        onQueryChange={setQuery}
        result={explore.result}
        communities={explore.communities}
        searching={explore.searching}
        searchError={explore.searchError}
        trending={explore.trending}
        trendingLoading={explore.trendingLoading}
        trendingError={explore.trendingError}
        highlights={explore.highlights}
        highlightsLoading={explore.trendingLoading}
        highlightsError={explore.highlightsError}
        renderDestination={renderDestination}
        badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
        renderAvatar={({ author }) => (
          <DesktopExploreAvatar author={author} />
        )}
      />
    </AppPageContent>
  );
}

function DesktopExploreAvatar({ author }: { author: PostAuthorView }) {
  const customization = author.customization;
  const avatarUrl =
    author.avatarUrl ?? customization?.assets.animatedAvatarUrl;
  const decorationUrl = customization?.assets.avatarDecorationUrl;
  const ringStyle = customization?.avatarRingId
    ? resolveRingStyle(customization.avatarRingId)
    : undefined;

  return (
    <ProfileAvatarVisual
      displayName={author.displayName}
      size="sm"
      ringClassName={ringStyle?.className}
      avatarImage={
        avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
      decorationImage={
        decorationUrl ? (
          <img
            src={decorationUrl}
            alt=""
            className="h-full w-full max-w-none object-contain object-center"
          />
        ) : undefined
      }
    />
  );
}
