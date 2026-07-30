import type { Session } from "@supabase/supabase-js";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ExploreView } from "@/components/explore/ExploreView";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import { resolveRingStyle } from "@/lib/customization/rings";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { PostAuthorView } from "@/types/domain";

import type { DesktopConfig } from "../config";
import { useDesktopExplore } from "./useDesktopExplore";

export function DesktopExplore({
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
    <div className="desktop-section-content">
      <ExploreView
        query={query}
        debouncedQuery={debouncedQuery}
        onQueryChange={setQuery}
        result={explore.result}
        searching={explore.searching}
        searchError={explore.searchError}
        trending={explore.trending}
        trendingLoading={explore.trendingLoading}
        trendingError={explore.trendingError}
        renderDestination={renderDestination}
        badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
        renderAvatar={({ author }) => (
          <DesktopExploreAvatar author={author} />
        )}
      />
    </div>
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
