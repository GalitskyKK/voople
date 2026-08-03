import type { Session } from "@supabase/supabase-js";

import { ProfilePageView } from "@/components/profile/ProfilePageView";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { FlipCard } from "@/components/profile/canvas/FlipCard";
import { ProfileCanvasPreview } from "@/components/profile/canvas/ProfileCanvasPreview";

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
          <FlipCard
            flipLabel="Оборот карточки — просмотр рисунка"
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
            renderBack={() => (
              <div className="voople-profile-canvas-back h-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                <ProfileCanvasPreview
                  strokes={data.canvasStrokes}
                  className="h-full min-h-[320px]"
                />
              </div>
            )}
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
      />
    </div>
  );
}
