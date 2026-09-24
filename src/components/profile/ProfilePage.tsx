"use client";

import { trpc } from "@/lib/trpc/client";
import type { ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";
import { ProfilePageView } from "./ProfilePageView";
import { ProfileCard } from "./ProfileCard";
import { ProfileCommonGroups } from "./ProfileCommonGroups";
import { ProfileFlipCard } from "./canvas/ProfileFlipCard";
import { StickyProfileHeader } from "./StickyProfileHeader";

type ProfilePageProps = {
  profile: ProfileViewModel;
  initialCanvasStrokes?: Stroke[];
  viewerId?: string | null;
  canFollow?: boolean;
};

export function ProfilePage({
  profile: initialProfile,
  initialCanvasStrokes = [],
  viewerId = null,
  canFollow = false,
}: ProfilePageProps) {
  const { data: liveProfile } = trpc.profile.getBetaByUsername.useQuery(
    { username: initialProfile.username },
    { initialData: initialProfile, refetchOnMount: false, refetchOnWindowFocus: false },
  );
  const profile = liveProfile ?? initialProfile;
  const isOwner = Boolean(viewerId && viewerId === profile.id);

  return <ProfilePageView
    telemetryKey={profile.id}
    card={<ProfileFlipCard
      profile={profile}
      isOwner={isOwner}
      viewerId={viewerId}
      initialStrokes={initialCanvasStrokes}
      front={<ProfileCard profile={profile} isOwner={isOwner} canFollow={canFollow} className="h-full" />}
    />}
    context={<ProfileCommonGroups userId={profile.id} isOwner={isOwner} />}
    renderStickyHeader={(visible) => <StickyProfileHeader
      visible={visible} profile={profile} isOwner={isOwner} canFollow={canFollow}
    />}
  />;
}
