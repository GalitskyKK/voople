"use client";
/* eslint-disable @next/next/no-img-element -- shared animated CDN artwork for Next.js and Tauri. */

import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

import { ProfileCardFrameDivider, ProfileCardFrameOverlay, frameLayerProps } from "@/components/profile/ProfileCardFrame";
import { MoodLevelMeter } from "@/components/profile/MoodLevelMeter";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { displayNamePresentation } from "@/lib/customization/display-name-style";
import { getMoodColor, getMoodEmoji, getMoodLabel } from "@/lib/constants/mood";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView, ProfileStatus, ProfileViewModel } from "@/types/domain";

export const APPEARANCE_SCENES = [
  { id: "midnight", label: "Ночь", background: "radial-gradient(circle at 18% 15%, #7259ba 0, transparent 34%), linear-gradient(145deg, #171322, #07080d 72%)" },
  { id: "aurora", label: "Север", background: "radial-gradient(circle at 75% 18%, #58d8bd 0, transparent 34%), radial-gradient(circle at 8% 80%, #7464ef 0, transparent 40%), #10141e" },
  { id: "paper", label: "Свет", background: "radial-gradient(circle at 72% 18%, #d4c4ff 0, transparent 35%), linear-gradient(145deg, #f5f2fa, #dfe7f1)" },
] as const;

export type AppearanceSceneId = (typeof APPEARANCE_SCENES)[number]["id"];
export type AppearanceProfile = Pick<ProfileViewModel, "username" | "displayName"> & {
  id?: string;
  customization: ProfileCustomizationView;
  status: ProfileStatus;
  stats?: ProfileViewModel["stats"];
  badgeIds?: string[];
};

function AppearanceBanner({ profile, active }: { profile: AppearanceProfile; active: boolean }) {
  const media = profile.customization.assets.bannerMedia;
  const fallback = profile.customization.bannerValue.color ?? profile.customization.themePrimary;
  return (
    <div className="profile-card__banner relative aspect-[8/3] h-auto overflow-hidden" style={{ background: fallback }}>
      {media.kind === "video" && active ? (
        <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster={media.posterUrl || undefined}>
          {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
          {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
        </video>
      ) : media.kind === "video" && media.posterUrl ? (
        <img src={media.posterUrl} alt="" className="h-full w-full object-cover" decoding="async" />
      ) : media.kind === "image" ? (
        <img src={media.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : profile.customization.bannerValue.url ? (
        <img src={profile.customization.bannerValue.url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" style={{ background: `radial-gradient(circle at 75% 20%, ${profile.customization.themeAccent} 0, transparent 36%), linear-gradient(135deg, ${fallback}, #0b0c12)` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}

function AppearanceBodyBackdrop({ profile }: { profile: AppearanceProfile }) {
  const { customization } = profile;
  const media = customization.assets.bannerMedia;
  if (customization.cardBaseMode === "theme") {
    return <div className="pointer-events-none absolute inset-0 rounded-[var(--profile-section-radius)]" style={{ background: `linear-gradient(135deg, ${customization.themePrimary}, ${customization.themeAccent})` }} aria-hidden />;
  }
  if (customization.cardBaseMode === "plain") {
    return <div className="pointer-events-none absolute inset-0 rounded-[var(--profile-section-radius)] bg-[#101116]" aria-hidden />;
  }
  const fallback = customization.bannerValue.color ?? customization.themePrimary;
  const imageUrl =
    media.kind === "video"
      ? media.posterUrl
      : media.kind === "image"
        ? media.imageUrl
        : customization.bannerValue.url;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--profile-section-radius)]" aria-hidden>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-md" decoding="async" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${fallback}, ${customization.themeAccent})` }} />
      )}
      <div className="absolute inset-0 bg-[#101116]/70 backdrop-blur-sm" />
    </div>
  );
}

export function ProfileAppearanceCardVisual({
  profile,
  scene,
  avatar,
  badges,
  className,
  variant = "share",
}: {
  profile: AppearanceProfile;
  scene: AppearanceSceneId;
  avatar: ReactNode;
  badges?: ReactNode;
  className?: string;
  variant?: "share" | "feed";
}) {
  const sceneData = APPEARANCE_SCENES.find((item) => item.id === scene) ?? APPEARANCE_SCENES[0];
  const { customization } = profile;
  const name = displayNamePresentation(customization.displayName);
  const frame = frameLayerProps(customization.assets.frame);
  const { ref, isIntersecting } = useIntersectionObserver({ rootMargin: "96px", threshold: 0.01 });
  const prefersReducedMotion = usePrefersReducedMotion();
  const mediaActive = isIntersecting && !prefersReducedMotion;

  return (
    <div ref={ref} className={cn("profile-share-scene relative mx-auto w-full overflow-hidden rounded-[1.6rem]", variant === "feed" ? "profile-share-scene--feed aspect-[4/5] sm:aspect-[16/9]" : "profile-share-scene--share aspect-[4/5]", mediaActive && "profile-share-scene--active", className)} style={{ background: sceneData.background }}>
      <div className="profile-share-scene__grain absolute inset-0 opacity-30" />
      <div className="absolute left-5 top-5 text-[10px] font-semibold tracking-[0.14em] text-white/55">VOOPLE / PROFILE</div>
      <article
        className={cn("profile-share-scene__card profile-card profile-card--split absolute left-1/2 z-10 w-[min(84%,21rem)]", variant === "feed" ? "top-[7%]" : "top-[10%]", frame.className)}
        style={{ ...frame.style, translate: "-50% 0", "--profile-share-scale": variant === "feed" ? ".78" : ".86", "--profile-section-gap": "1.25rem", "--profile-banner-height": "7rem", "--profile-frame-width": customization.assets.frame ? `${Math.min(customization.assets.frame.width, 18)}px` : "10px", "--profile-frame-outset": customization.assets.frame ? `${Math.min(customization.assets.frame.width, 18)}px` : "10px" } as React.CSSProperties}
      >
        <div className="flex flex-col gap-[var(--profile-section-gap)]">
          <AppearanceBanner profile={profile} active={mediaActive} />
          <div className="profile-card__body relative bg-[#101116] px-5 pb-5 text-white shadow-[0_22px_60px_rgba(0,0,0,.32)]">
            <ProfileCardFrameDivider frame={customization.assets.frame} />
            <AppearanceBodyBackdrop profile={profile} />
            <div className="relative z-20 -mt-8 w-fit">{avatar}</div>
            <h3 className={cn("relative z-20 mt-3 truncate text-xl font-bold", name.className)} style={name.style}>{profile.displayName}</h3>
            <p className="relative z-20 text-xs text-white/55">@{profile.username}</p>
            {badges}
            {profile.status.moodValue != null && profile.status.moodValue > 0 ? (
              <div className="relative z-20 mt-3">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-white/78"><span className="mr-1.5" aria-hidden>{getMoodEmoji(profile.status.moodValue)}</span>{getMoodLabel(profile.status.moodValue)}</span>
                </div>
                <MoodLevelMeter value={profile.status.moodValue} color={getMoodColor(profile.status.moodValue)} light />
              </div>
            ) : null}
            {profile.status.thought ? <p className="relative z-20 mt-3 line-clamp-2 border-l border-white/18 pl-3 text-sm leading-5 text-white/78">{profile.status.thought}</p> : null}
            {profile.status.trackTitle || profile.status.trackArtist ? (
              <div className="relative z-20 mt-3 flex min-w-0 items-center gap-2 border-t border-white/10 pt-2.5 text-xs text-white/70">
                <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]" />
                <span className="truncate">{[profile.status.trackArtist, profile.status.trackTitle].filter(Boolean).join(" — ")}</span>
              </div>
            ) : null}
            {profile.stats ? <div className="relative z-20 mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
              <div><b className="block text-sm">{profile.stats.posts}</b><span className="text-[9px] uppercase tracking-wide text-white/45">постов</span></div>
              <div><b className="block text-sm">{profile.stats.followers}</b><span className="text-[9px] uppercase tracking-wide text-white/45">читателей</span></div>
              <div><b className="block text-sm">{profile.stats.views}</b><span className="text-[9px] uppercase tracking-wide text-white/45">просмотров</span></div>
            </div> : null}
          </div>
        </div>
        <ProfileCardFrameOverlay frame={customization.assets.frame} />
      </article>
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-[10px] font-medium text-white/50"><span>Мой образ сейчас</span><span>voople.ru/{profile.username}</span></div>
    </div>
  );
}
