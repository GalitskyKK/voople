import type { Session } from "@supabase/supabase-js";
import { useMemo } from "react";

import { ProfileAppearanceCardVisual } from "@/components/profile/ProfileAppearanceCardVisual";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBadgesView } from "@/components/profile/ProfileBadgesView";
import { ProfileShareController } from "@/components/profile/ProfileShareController";
import type { ProfileViewModel } from "@/types/domain";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopProfileShareAdapter({
  profile,
  badgeIds,
  config,
  session,
  navigate,
  onPublished,
}: {
  profile: ProfileViewModel;
  badgeIds: string[];
  config: DesktopConfig;
  session: Session;
  navigate: (href: string) => void;
  onPublished: () => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  return (
    <ProfileShareController
      displayName={profile.displayName}
      profileUrl={`${config.apiUrl}/${profile.username}`}
      renderPreview={(scene) => (
        <ProfileAppearanceCardVisual
          profile={profile}
          scene={scene}
          className="max-w-[25rem]"
          avatar={
            <ProfileAvatar
              displayName={profile.displayName}
              size="md"
              ring={profile.customization.flags.hasAvatarRing}
              ringId={profile.customization.avatarRingId}
              decorationUrl={profile.customization.assets.avatarDecorationUrl}
              animatedAvatarUrl={profile.customization.assets.animatedAvatarUrl}
            />
          }
          badges={
            <ProfileBadgesView
              badgeIds={badgeIds}
              className="relative z-20 mt-2"
              compact
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
        />
      )}
      publish={async ({ caption, scene }) => {
        await client.mutation("post.create", {
          text: caption || undefined,
          appearanceScene: scene,
        });
        onPublished();
      }}
    />
  );
}
