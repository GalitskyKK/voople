"use client";

import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import {
  frameLayerProps,
  ProfileCardFrameDivider,
  ProfileCardFrameOverlay,
} from "@/components/profile/ProfileCardFrame";
import { profileCardThemeStyle } from "@/components/profile/profile-card-style";
import { ProfileCardVideoSections } from "@/components/profile/ProfileCardVideoSections";
import { ProfileGroupTagVisual } from "@/components/profile/ProfileGroupTagVisual";
import { ProfileMeta } from "@/components/profile/ProfileMeta";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { displayNamePresentation } from "@/lib/customization/display-name-style";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView, ProfileViewModel } from "@/types/domain";

import type { ProfileEditorGroupTag } from "./profile-editor-models";

type Props = {
  profile: ProfileViewModel;
  customization: ProfileCustomizationView;
  groupTag: ProfileEditorGroupTag | null;
  avatarUrl: string | null;
  name: string;
  bio: string;
  editing: "name" | "bio" | null;
  onEditingChange: (editing: "name" | "bio" | null) => void;
  onNameChange: (name: string) => void;
  onBioChange: (bio: string) => void;
  onAvatarClick: () => void;
};

export function ProfileEditorFeedPreview({
  customization,
  avatarUrl,
  name,
}: Pick<Props, "customization" | "avatarUrl" | "name">) {
  const nickname = displayNamePresentation(customization.displayName);
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--app-muted)]">Предпросмотр в публикации</p>
      <div className="voople-author-nameplate relative h-14 min-w-0 overflow-hidden rounded-xl">
        <FeedAuthorChipBackdrop backgroundUrl={customization.assets.feedCardBackgroundUrl} />
        <div className="absolute inset-0 z-10 flex min-w-0 items-center">
          <span className="absolute left-10 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ProfileAvatar displayName={name} size="sm" ring={customization.flags.hasAvatarRing} ringId={customization.avatarRingId} decorationUrl={customization.assets.avatarDecorationUrl} animatedAvatarUrl={avatarUrl ?? customization.assets.animatedAvatarUrl} />
          </span>
          <span className={cn("ml-20 min-w-0 max-w-[calc(100%_-_6rem)] truncate text-sm font-semibold", customization.flags.hasDisplayNameStyle ? nickname.className : "text-[var(--foreground)]")} style={customization.flags.hasDisplayNameStyle ? nickname.style : undefined}>{name}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--app-muted)]">Аватар и имя накладываются интерфейсом — добавлять их внутрь ассета не нужно.</p>
    </div>
  );
}

export function ProfileEditorPreview(props: Props) {
  const { profile, customization, groupTag, avatarUrl, name, bio, editing, onEditingChange, onNameChange, onBioChange, onAvatarClick } = props;
  const frame = frameLayerProps(customization.assets.frame);
  const hasMedia = customization.flags.hasBannerMedia && customization.assets.bannerMedia.kind !== "none";
  const themeStyle = profileCardThemeStyle(customization);
  const nickname = displayNamePresentation(customization.displayName);

  const identity = (
    <div className="relative z-10 px-5">
      <button type="button" onClick={onAvatarClick} className="-mt-10 block rounded-full focus:outline-none focus:ring-2 focus:ring-(--theme-accent)" aria-label="Открыть настройки аватара">
        <ProfileAvatar displayName={name} size="lg" ring={customization.flags.hasAvatarRing} ringId={customization.avatarRingId} decorationUrl={customization.assets.avatarDecorationUrl} animatedAvatarUrl={avatarUrl ?? customization.assets.animatedAvatarUrl} />
      </button>
      {editing === "name" ? (
        <input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} onBlur={() => onEditingChange(null)} className="mt-4 w-full rounded-lg bg-black/25 px-2 py-1 text-2xl font-bold outline-none ring-1 ring-(--theme-accent)" maxLength={50} />
      ) : (
        <button type="button" className={cn("mt-4 block max-w-full text-left text-2xl font-bold hover:underline", nickname.className)} style={customization.flags.hasDisplayNameStyle ? nickname.style : undefined} onClick={() => onEditingChange("name")}>{name}</button>
      )}
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">@{profile.username}</p>
        {groupTag ? <ProfileGroupTagVisual value={groupTag} /> : null}
      </div>
    </div>
  );

  const details = (
    <div className="relative z-10 px-5 pb-6">
      {editing === "bio" ? (
        <textarea autoFocus value={bio} onChange={(event) => onBioChange(event.target.value)} onBlur={() => onEditingChange(null)} className="mt-5 w-full resize-none rounded-lg bg-black/25 p-2 text-sm outline-none ring-1 ring-(--theme-accent)" rows={3} maxLength={100} />
      ) : (
        <button type="button" className="mt-5 block min-h-12 w-full text-left text-sm text-[color-mix(in_srgb,var(--foreground)_72%,transparent)] hover:underline" onClick={() => onEditingChange("bio")}>{bio || "Нажмите, чтобы рассказать о себе"}</button>
      )}
      <div className="mt-5 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-4"><ProfileMeta createdAt={profile.createdAt} subscriptionStartedAt={profile.subscriptionStartedAt} /></div>
      <div className="mt-5"><ProfileStats {...profile.stats} /></div>
    </div>
  );
  const body = <div className="profile-card__body" style={themeStyle}><ProfileCardFrameDivider frame={customization.assets.frame} />{identity}{details}</div>;

  return (
    <article className={cn("profile-card voople-profile-card profile-card--split relative h-fit w-full", frame.className)} style={{ ...themeStyle, ...frame.style }}>
      {hasMedia ? (
        <ProfileCardVideoSections media={customization.assets.bannerMedia} baseMode={customization.cardBaseMode} themePrimary={customization.themePrimary} themeAccent={customization.themeAccent} frame={customization.assets.frame} header={identity}>{details}</ProfileCardVideoSections>
      ) : (
        <div className="flex flex-col gap-[var(--profile-section-gap)]"><div className="relative z-[2] overflow-hidden rounded-[var(--profile-section-radius)]"><ProfileBanner customization={customization} className="h-[var(--profile-banner-height)] aspect-auto" /></div>{body}</div>
      )}
      <ProfileCardFrameOverlay frame={customization.assets.frame} />
    </article>
  );
}
