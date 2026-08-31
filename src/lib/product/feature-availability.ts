export const PRODUCT_PLATFORMS = [
  "web",
  "windows",
  "macos",
  "linux",
  "android",
  "ios",
] as const;

export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];
export type ProductReleaseChannel = "internal" | "beta" | "stable";
export type ProductExposure = "primary" | "secondary" | "hidden";

export const PRODUCT_FEATURES = [
  "direct_messages",
  "group_chat",
  "search",
  "notifications",
  "profile",
  "mood",
  "music",
  "posts",
  "events",
  "store",
  "public_groups",
  "feed_recommendations",
  "core_rework_shell",
  "multi_room_groups",
] as const;

export type ProductFeature = (typeof PRODUCT_FEATURES)[number];

export type FeatureAvailabilityRule = Readonly<{
  exposure: ProductExposure;
  platforms: readonly ProductPlatform[];
  channels: readonly ProductReleaseChannel[];
  serverCapability?: ProductFeature;
  fallbackHref: string;
}>;

const ALL_CHANNELS = ["internal", "beta", "stable"] as const;
const CURRENT_PLATFORMS = ["web", "windows"] as const;

export const FEATURE_AVAILABILITY = Object.freeze({
  direct_messages: {
    exposure: "primary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  group_chat: {
    exposure: "primary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  search: {
    exposure: "primary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  notifications: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  profile: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  mood: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/me",
  },
  music: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/me",
  },
  posts: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/me",
  },
  events: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/messages",
  },
  store: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ALL_CHANNELS,
    fallbackHref: "/me",
  },
  public_groups: {
    exposure: "secondary",
    platforms: CURRENT_PLATFORMS,
    channels: ["internal", "beta"],
    fallbackHref: "/explore",
  },
  feed_recommendations: {
    exposure: "secondary",
    platforms: ["web"],
    channels: ["internal", "beta"],
    fallbackHref: "/messages",
  },
  core_rework_shell: {
    exposure: "primary",
    platforms: CURRENT_PLATFORMS,
    channels: ["internal"],
    serverCapability: "core_rework_shell",
    fallbackHref: "/messages",
  },
  multi_room_groups: {
    exposure: "primary",
    platforms: CURRENT_PLATFORMS,
    channels: ["internal"],
    serverCapability: "multi_room_groups",
    fallbackHref: "/messages",
  },
} satisfies Record<ProductFeature, FeatureAvailabilityRule>);

export type FeatureAvailabilityContext = Readonly<{
  platform: ProductPlatform;
  channel: ProductReleaseChannel;
  serverCapabilities?: ReadonlySet<ProductFeature>;
}>;

export type ResolvedFeatureAvailability = Readonly<{
  enabled: boolean;
  exposure: ProductExposure;
  fallbackHref: string;
  reason: "available" | "platform" | "channel" | "server";
}>;

export function resolveFeatureAvailability(
  feature: ProductFeature,
  context: FeatureAvailabilityContext,
): ResolvedFeatureAvailability {
  const rule: FeatureAvailabilityRule = FEATURE_AVAILABILITY[feature];

  if (!rule.platforms.includes(context.platform)) {
    return disabled(rule, "platform");
  }
  if (!rule.channels.includes(context.channel)) {
    return disabled(rule, "channel");
  }
  if (
    rule.serverCapability
    && !context.serverCapabilities?.has(rule.serverCapability)
  ) {
    return disabled(rule, "server");
  }

  return {
    enabled: true,
    exposure: rule.exposure,
    fallbackHref: rule.fallbackHref,
    reason: "available",
  };
}

function disabled(
  rule: FeatureAvailabilityRule,
  reason: Exclude<ResolvedFeatureAvailability["reason"], "available">,
): ResolvedFeatureAvailability {
  return {
    enabled: false,
    exposure: "hidden",
    fallbackHref: rule.fallbackHref,
    reason,
  };
}
