"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CSSProperties } from "react";

import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import { DisplayNameWithPin } from "./DisplayNameWithPin";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { ProfileFollowButton } from "./ProfileFollowButton";
import { ProfileMessageButton } from "./ProfileMessageButton";

type StickyProfileHeaderProps = {
  visible: boolean;
  profile: ProfileViewModel;
  isOwner: boolean;
  canFollow: boolean;
};

export function StickyProfileHeader({
  visible,
  profile,
  isOwner,
  canFollow,
}: StickyProfileHeaderProps) {
  if (!visible) return null;

  const { customization, displayName, username } = profile;
  const { displayName: nameStyle, flags, assets } = customization;
  const useFeedChip = flags.hasFeedCardStyle;

  const useGradientName = nameStyle.gradient && flags.hasDisplayNameStyle;
  const nicknameStyle = nameStyle.gradient
    ? { backgroundImage: `linear-gradient(90deg, ${nameStyle.color ?? "#e5e5e5"}, #fff)` }
    : { color: nameStyle.color ?? undefined };

  const themeStyle = {
    "--theme-primary": customization.themePrimary,
    "--theme-accent": customization.themeAccent,
  } as CSSProperties;

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      {isOwner ? (
        <ProfileEditSheet profile={profile} />
      ) : (
        <>
          <ProfileFollowButton username={username} canFollow={canFollow} layout="compact" />
          <ProfileMessageButton username={username} size="sm" />
        </>
      )}
    </div>
  );

  if (useFeedChip) {
    return (
      <header
        className="voople-profile-sticky fixed left-0 right-0 top-12 z-40 h-[52px] overflow-hidden border-b border-white/10 lg:hidden"
        style={themeStyle}
      >
        <FeedAuthorChipBackdrop customization={customization} />
        <div className="relative z-10 flex h-full items-center gap-3 px-3">
          <Link href="/feed" className="shrink-0 text-white/80" aria-label="Назад">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <ProfileAvatar
            displayName={displayName}
            size="sm"
            ring={flags.hasAvatarRing}
            decorationUrl={assets.avatarDecorationUrl}
            animatedAvatarUrl={assets.animatedAvatarUrl}
          />
          <div className="min-w-0 flex-1">
            <DisplayNameWithPin
              hasVooplePlus={profile.hasVooplePlus}
              subscriptionExpiresAt={profile.subscriptionExpiresAt}
              size="sm"
              className="w-full"
              nameClassName={cn(
                "text-sm font-semibold",
                useGradientName ? "bg-clip-text text-transparent" : "text-white",
              )}
              style={useGradientName ? nicknameStyle : undefined}
            >
              {displayName}
            </DisplayNameWithPin>
            <span className="sr-only">@{username}</span>
          </div>
          {actions}
        </div>
      </header>
    );
  }

  return (
    <header
      className="voople-profile-sticky fixed left-0 right-0 top-12 z-40 flex h-[52px] items-center gap-3 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-3 backdrop-blur-md lg:hidden"
      style={themeStyle}
    >
      <Link href="/feed" className="shrink-0 text-white/80" aria-label="Назад">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <ProfileAvatar
        displayName={displayName}
        size="sm"
        ring={flags.hasAvatarRing}
        ringId={customization.avatarRingId}
        decorationUrl={assets.avatarDecorationUrl}
        animatedAvatarUrl={assets.animatedAvatarUrl}
      />
      <div className="min-w-0 flex-1">
        <DisplayNameWithPin
          hasVooplePlus={profile.hasVooplePlus}
          subscriptionExpiresAt={profile.subscriptionExpiresAt}
          size="sm"
          className="w-full"
          nameClassName={cn(
            "text-sm font-medium",
            useGradientName ? "bg-clip-text text-transparent" : "text-white",
          )}
          style={useGradientName ? nicknameStyle : undefined}
        >
          {displayName}
        </DisplayNameWithPin>
        <span className="sr-only">@{username}</span>
      </div>
      {actions}
    </header>
  );
}
