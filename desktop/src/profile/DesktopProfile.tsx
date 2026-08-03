import type { Session } from "@supabase/supabase-js";

import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { ProfileQuestions } from "@/components/profile/ProfileQuestions";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileFlipCard } from "@/components/profile/canvas/ProfileFlipCard";

import type { DesktopConfig } from "../config";
import { DesktopPostCard } from "../feed/DesktopPostCard";
import { DesktopProfileCard } from "./DesktopProfileCard";
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
      <div
        className="desktop-section-content"
        aria-label="Загрузка профиля"
      >
        <div className="feed-skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="desktop-section-content">
        <div className="feed-message" role="alert">
          <p>{error ?? "Профиль не найден"}</p>
          <button type="button" onClick={reload}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-section-content">
      <ProfilePageView
        posts={data.posts}
        card={
          <ProfileFlipCard
            profile={data.profile}
            isOwner={data.isOwner}
            viewerId={session.user.id}
            initialStrokes={data.canvasStrokes}
            realtimeEnabled={false}
            front={
              <DesktopProfileCard
                profile={data.profile}
                config={config}
                session={session}
                isOwner={data.isOwner}
                onAppearancePublished={reload}
                navigate={navigate}
              />
            }
          />
        }
        renderPost={(post) => (
          <DesktopPostCard
            key={post.id}
            post={post}
            config={config}
            session={session}
            renderDestination={renderDestination}
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
    </div>
  );
}
