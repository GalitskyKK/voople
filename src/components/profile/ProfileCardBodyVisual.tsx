import type { ReactNode } from "react";

import type { ProfileViewModel } from "@/types/domain";
import { ProfileMeta } from "./ProfileMeta";
import { ProfileStats } from "./ProfileStats";
import { ProfilePresenceLabel } from "./ProfilePresenceLabel";

type ProfileCardBodyVisualProps = {
  profile: ProfileViewModel;
  relationshipActions?: ReactNode;
  status?: ReactNode;
  reactions?: ReactNode;
  shareAction?: ReactNode;
};

export function ProfileCardBodyVisual({
  profile,
  relationshipActions,
  status,
  reactions,
  shareAction,
}: ProfileCardBodyVisualProps) {
  return (
    <div className="relative px-4 pb-4">
      {profile.bio ? (
        <p className="mt-2 text-sm leading-5 text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          {profile.bio}
        </p>
      ) : null}
      {profile.lastSeenAt ? (
        <p className="mt-2 text-xs text-[var(--app-muted)]">
          <ProfilePresenceLabel userId={profile.id} lastSeenAt={profile.lastSeenAt} />
        </p>
      ) : null}
      {relationshipActions ? (
        <div className="mt-3 flex items-end gap-2">{relationshipActions}</div>
      ) : null}
      <div className="mt-3">
        <ProfileMeta
          createdAt={profile.createdAt}
          subscriptionStartedAt={profile.subscriptionStartedAt}
        />
      </div>
      {status ? <div className="mt-3">{status}</div> : null}
      <div className="mt-3 space-y-2">
        {reactions}
        {shareAction}
        <ProfileStats {...profile.stats} />
      </div>
    </div>
  );
}
