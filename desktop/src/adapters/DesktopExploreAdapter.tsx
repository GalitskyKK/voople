import type { Session } from "@supabase/supabase-js";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ExploreView } from "@/components/explore/ExploreView";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import type { BetaSearchPerson } from "@/types/search";

import type { DesktopConfig } from "../config";
import { useDesktopExplore } from "../explore/useDesktopExplore";

export function DesktopExploreAdapter({
  config,
  session,
  renderDestination,
  navigate,
}: {
  config: DesktopConfig;
  session: Session;
  renderDestination: NavigationDestinationRenderer;
  navigate: (href: string) => void;
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
        renderDestination={renderDestination}
        onNavigate={navigate}
        renderAvatar={(person) => (
          <DesktopExploreAvatar person={person} />
        )}
      />
    </AppPageContent>
  );
}

function DesktopExploreAvatar({ person }: { person: BetaSearchPerson }) {

  return (
    <ProfileAvatarVisual
      displayName={person.displayName}
      size="sm"
      avatarImage={
        person.avatarUrl ? (
          <img
            src={person.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
    />
  );
}
