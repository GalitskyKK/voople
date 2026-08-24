import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

import { RichText } from "@/components/ui/RichText";
import { getMoodEmoji, getMoodLabel } from "@/lib/constants/mood";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileCardIdentityVisual } from "./ProfileCardIdentityVisual";
import { ProfileCardVisual } from "./ProfileCardVisual";
import { ProfileMeta } from "./ProfileMeta";
import { ProfileStats } from "./ProfileStats";

type MiniProfileCardViewProps = {
  profile: ProfileViewModel;
  online: boolean;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Portable mini-profile presentation. Data and platform actions stay outside. */
export function MiniProfileCardView({
  profile,
  online,
  badges,
  actions,
  className,
}: MiniProfileCardViewProps) {
  const { customization, status } = profile;

  return (
    <ProfileCardVisual
      customization={customization}
      className={cn(
        "w-full border border-[var(--app-border)] shadow-[var(--app-shadow-lg)] [--profile-banner-height:6rem] [--profile-section-gap:2rem] [--profile-section-radius:1.5rem]",
        className,
      )}
      banner={
        <ProfileBanner
          customization={customization}
          className="h-[var(--profile-banner-height)] aspect-auto"
        />
      }
      header={
        <ProfileCardIdentityVisual
          customization={customization}
          displayName={profile.displayName}
          username={profile.username}
          hasVooplePlus={profile.hasVooplePlus}
          subscriptionExpiresAt={profile.subscriptionExpiresAt}
          groupTag={profile.groupTag}
          badges={badges}
          avatar={
            <ProfileAvatar
              displayName={profile.displayName}
              size="lg"
              ring={customization.flags.hasAvatarRing}
              ringId={customization.avatarRingId}
              decorationUrl={customization.assets.avatarDecorationUrl}
              animatedAvatarUrl={customization.assets.animatedAvatarUrl}
              isOnline={online}
            />
          }
        />
      }
      body={
        <div className="relative px-4 pb-4">
          <p className="mt-2 flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                online ? "bg-emerald-400" : "bg-[var(--app-muted)]",
              )}
              aria-hidden
            />
            <span className="text-[color-mix(in_srgb,var(--foreground)_58%,transparent)]">
              {online
                ? "Сейчас в сети"
                : profile.lastSeenAt
                  ? "Недавно был(а) в сети"
                  : "Не в сети"}
            </span>
          </p>

          {profile.bio ? (
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-[color-mix(in_srgb,var(--foreground)_68%,transparent)]">
              <RichText text={profile.bio} />
            </p>
          ) : null}

          {profile.interests?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Интересы">
              {profile.interests.slice(0, 6).map((interest) => (
                <span
                  key={interest.slug}
                  className="rounded-full border border-[color-mix(in_srgb,var(--theme-accent)_24%,var(--app-border))] bg-[color-mix(in_srgb,var(--theme-accent)_9%,var(--app-surface-soft))] px-2 py-1 text-[11px] text-[var(--foreground)]"
                >
                  {interest.name}
                </span>
              ))}
            </div>
          ) : null}

          {status.moodValue || status.thought || status.trackTitle || status.trackArtist ? (
            <div className="mt-3 space-y-2 rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] p-3 text-xs">
              {status.moodValue ? (
                <p>
                  <span className="mr-2" aria-hidden>{getMoodEmoji(status.moodValue)}</span>
                  <span className="font-medium">{getMoodLabel(status.moodValue)}</span>
                  {status.thought ? <span className="text-[color-mix(in_srgb,var(--foreground)_58%,transparent)]"> · <RichText text={status.thought} /></span> : null}
                </p>
              ) : status.thought ? (
                <p className="text-[color-mix(in_srgb,var(--foreground)_58%,transparent)]"><RichText text={status.thought} /></p>
              ) : null}
              {status.trackTitle || status.trackArtist ? (
                <p className="flex items-center gap-2 text-[color-mix(in_srgb,var(--foreground)_58%,transparent)]">
                  <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]" />
                  <span className="truncate">{[status.trackArtist, status.trackTitle].filter(Boolean).join(" — ")}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
          <div className="mt-3"><ProfileMeta createdAt={profile.createdAt} subscriptionStartedAt={profile.subscriptionStartedAt} /></div>
          <ProfileStats {...profile.stats} className="mt-3" />
        </div>
      }
    />
  );
}
