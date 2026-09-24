import type { Session } from "@supabase/supabase-js";

import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { ProfileCommonGroups } from "@/components/profile/ProfileCommonGroups";
import { ProfileBadgesView } from "@/components/profile/ProfileBadgesView";
import { ProfileCardView } from "@/components/profile/ProfileCardView";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileRelationshipActions } from "@/components/profile/ProfileRelationshipActions";
import { ProfileStatusSection } from "@/components/profile/ProfileStatusSection";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileFlipCard } from "@/components/profile/canvas/ProfileFlipCard";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { PROFILE_STATUS_VISIBLE } from "@/lib/product/profile-beta-surface";
import { ProfileLoadingView } from "@/components/profile/ProfileLoadingView";

import type { DesktopConfig } from "../config";
import { useDesktopProfile } from "../profile/useDesktopProfile";
import { DesktopProfileShareAdapter } from "./DesktopProfileShareAdapter";

export function DesktopProfileAdapter({
  config,
  session,
  username,
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
        <ProfileLoadingView />
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
        context={<ProfileCommonGroups userId={data.profile.id} isOwner={data.isOwner} onNavigate={navigate} />}
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
                    <ProfileRelationshipActions
                      userId={data.profile.id}
                      username={data.profile.username}
                      canFollow
                      onNavigate={navigate}
                    />
                  )
                }
                status={PROFILE_STATUS_VISIBLE ? (
                  <ProfileStatusSection
                    username={data.profile.username}
                    initialStatus={data.profile.status}
                    isOwner={data.isOwner}
                    onPublished={reload}
                  />
                ) : undefined}
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
      />
    </AppPageContent>
  );
}
