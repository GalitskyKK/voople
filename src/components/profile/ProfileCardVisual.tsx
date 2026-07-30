import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";
import {
  frameLayerProps,
  ProfileCardFrameDivider,
  ProfileCardFrameOverlay,
} from "./ProfileCardFrame";
import { ProfileCardVideoSections } from "./ProfileCardVideoSections";
import { profileCardThemeStyle } from "./profile-card-style";

type ProfileCardVisualProps = {
  customization: ProfileCustomizationView;
  header: ReactNode;
  body: ReactNode;
  banner: ReactNode;
  editAction?: ReactNode;
  className?: string;
};

export function ProfileCardVisual({
  customization,
  header,
  body,
  banner,
  editAction,
  className,
}: ProfileCardVisualProps) {
  const { flags, assets, cardBaseMode } = customization;
  const hasBannerMedia =
    flags.hasBannerMedia && assets.bannerMedia.kind !== "none";
  const framed = assets.frame !== null;
  const frame = frameLayerProps(assets.frame);
  const themeStyle = profileCardThemeStyle(customization);
  const articleStyle = framed
    ? ({
        "--theme-accent": customization.themeAccent,
        ...frame.style,
      } as React.CSSProperties)
    : hasBannerMedia
      ? themeStyle
      : ({ ...themeStyle, background: "transparent" } as React.CSSProperties);

  const articleClassName = cn(
    "profile-card voople-profile-card profile-card--split relative",
    frame.className,
    className,
  );

  if (hasBannerMedia) {
    return (
      <article className={articleClassName} style={articleStyle}>
        {editAction}
        <ProfileCardVideoSections
          media={assets.bannerMedia}
          baseMode={cardBaseMode}
          themePrimary={customization.themePrimary}
          themeAccent={customization.themeAccent}
          frame={assets.frame}
          header={header}
        >
          {body}
        </ProfileCardVideoSections>
        <ProfileCardFrameOverlay frame={assets.frame} />
      </article>
    );
  }

  return (
    <article className={articleClassName} style={articleStyle}>
      {editAction}
      <div className="flex flex-col gap-[var(--profile-section-gap)]">
        <div className="relative z-[2] overflow-hidden rounded-[var(--profile-section-radius)]">
          {banner}
        </div>
        <div className="profile-card__body" style={themeStyle}>
          <ProfileCardFrameDivider frame={assets.frame} />
          {header}
          {body}
        </div>
      </div>
      <ProfileCardFrameOverlay frame={assets.frame} />
    </article>
  );
}
