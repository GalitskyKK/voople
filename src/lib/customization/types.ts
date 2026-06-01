export type CustomizationFlags = {
  hasCustomTheme: boolean;
  hasBanner: boolean;
  hasProfileEffect: boolean;
  hasAvatarDecoration: boolean;
  hasAnimatedAvatar: boolean;
  hasFeedCardStyle: boolean;
  hasDisplayNameStyle: boolean;
  hasAvatarRing: boolean;
};

export type CustomizationAssets = {
  bannerUrl?: string | null;
  profileEffectUrl?: string | null;
  avatarDecorationUrl?: string | null;
  animatedAvatarUrl?: string | null;
  feedCardBackgroundUrl?: string | null;
};

export type DisplayNameStyle = {
  color?: string | null;
  gradient?: boolean;
};

export type ResolvedCustomization = {
  themePrimary: string;
  themeAccent: string;
  flags: CustomizationFlags;
  assets: CustomizationAssets;
  displayName: DisplayNameStyle;
  avatarRingId?: string | null;
};
