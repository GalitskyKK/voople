import type { Session } from "@supabase/supabase-js";

import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { ProfileQuestions } from "@/components/profile/ProfileQuestions";
import { ProfileBadgesView } from "@/components/profile/ProfileBadgesView";
import { ProfileCardView } from "@/components/profile/ProfileCardView";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileMessageAction } from "@/components/profile/ProfileMessageAction";
import { ProfileReactions } from "@/components/profile/ProfileReactions";
import { ProfileStatusSection } from "@/components/profile/ProfileStatusSection";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileFlipCard } from "@/components/profile/canvas/ProfileFlipCard";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";

import type { DesktopConfig } from "../config";
import { DesktopPostCardAdapter } from "../adapters/DesktopPostCardAdapter";
import { DesktopProfileShareAdapter } from "../adapters/DesktopProfileShareAdapter";
import { useDesktopProfile } from "./useDesktopProfile";

export function DesktopProfile({
  config,
  session,
  username,
  renderDestination,
  navigate,
}: {
  config: DesktopConfig;
  session: Session;
  username: string | null;
  renderDestination: NavigationDestinationRenderer;
  navigate: (href: string) => void;
}) {
  const { data, error, loading, reload } = useDesktopProfile(
    config,
    session,
    username,
  );

  if (loading) {
    return (
      <AppPageContent
        className="py-4 lg:py-6"
        aria-label="Загрузка профиля"
      >
        <div className="feed-skeleton h-80 rounded-2xl" />
      </AppPageContent>
    );
  }

  if (error || !data) {
    return (
      <AppPageContent className="py-4 lg:py-6">
        <div className="feed-message" role="alert">
          <p>{error ?? "Профиль не найден"}</p>
          <button type="button" onClick={reload}>
            Повторить
          </button>
        </div>
      </AppPageContent>
    );
  }

  return (
    <AppPageContent>
      <ProfilePageView
        telemetryKey={data.profile.id}
        posts={data.posts}
        pinnedPost={data.pinnedPost}
        card={
          <ProfileFlipCard
            profile={data.profile}
            isOwner={data.isOwner}
            viewerId={session.user.id}
            initialStrokes={data.canvasStrokes}
            realtimeEnabled={false}
            front={
              <ProfileCardView
                profile={data.profile}
                badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
                badges={
                  <ProfileBadgesView
                    badgeIds={data.badgeIds}
                    compact
                    className="mt-0 min-w-0 flex-nowrap overflow-hidden"
                    renderEventAction={(dismiss) => (
                      <button
                        type="button"
                        className="mt-4 text-sm font-medium text-(--theme-accent)"
                        onClick={() => {
                          dismiss();
                          navigate("/events");
                        }}
                      >
                        Открыть событие
                      </button>
                    )}
                  />
                }
                relationshipActions={
                  data.isOwner ? undefined : (
                    <>
                      <ProfileFollowButton
                        username={data.profile.username}
                        canFollow
                      />
                      <ProfileMessageAction
                        username={data.profile.username}
                        size="sm"
                        onNavigate={navigate}
                      />
                    </>
                  )
                }
                status={
                  <ProfileStatusSection
                    username={data.profile.username}
                    initialStatus={data.profile.status}
                    isOwner={data.isOwner}
                    onPublished={reload}
                  />
                }
                reactions={
                  <ProfileReactions
                    profileUserId={data.profile.id}
                    canReact={!data.isOwner}
                    realtimeEnabled={false}
                  />
                }
                shareAction={
                  data.isOwner ? (
                    <DesktopProfileShareAdapter
                      profile={data.profile}
                      badgeIds={data.badgeIds}
                      config={config}
                      session={session}
                      navigate={navigate}
                      onPublished={reload}
                    />
                  ) : undefined
                }
                editAction={
                  data.isOwner ? (
                    <ProfileEditSheet
                      profile={data.profile}
                      onUpdated={reload}
                      onNavigate={navigate}
                    />
                  ) : undefined
                }
              />
            }
          />
        }
        renderPost={(post) => (
          <DesktopPostCardAdapter
            key={post.id}
            post={post}
            config={config}
            session={session}
            renderDestination={renderDestination}
            ownerProfile={
              data.isOwner
                ? {
                    isPinned: false,
                    onChanged: reload,
                  }
                : undefined
            }
          />
        )}
        renderPinnedPost={(post) => (
          <DesktopPostCardAdapter
            key={`pinned:${post.id}`}
            post={post}
            config={config}
            session={session}
            renderDestination={renderDestination}
            ownerProfile={
              data.isOwner
                ? {
                    isPinned: true,
                    onChanged: reload,
                  }
                : undefined
            }
          />
        )}
        renderQuestions={() => (
          <ProfileQuestions
            profileUserId={data.profile.id}
            username={data.profile.username}
            isOwner={data.isOwner}
            canAsk={!data.isOwner}
            canReact
          />
        )}
      />
    </AppPageContent>
  );
}
