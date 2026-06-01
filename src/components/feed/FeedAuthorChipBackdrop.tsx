import type { CSSProperties } from "react";

import type { ProfileCustomizationView } from "@/types/domain";

type FeedAuthorChipBackdropProps = {
  customization: ProfileCustomizationView;
};

/** Shared feed-card author strip background (post header + profile sticky). */
export function FeedAuthorChipBackdrop({ customization }: FeedAuthorChipBackdropProps) {
  const bgUrl = customization.assets.feedCardBackgroundUrl;

  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-right"
        style={{
          backgroundColor: customization.themePrimary,
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-primary)]/92 to-transparent"
        style={{ "--theme-primary": customization.themePrimary } as CSSProperties}
      />
    </>
  );
}
