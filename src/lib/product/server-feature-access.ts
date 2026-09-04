import {
  PRODUCT_FEATURES,
  resolveFeatureAvailability,
  type ProductFeature,
  type ProductReleaseChannel,
} from "./feature-availability.ts";

type ServerFeatureAccessReason =
  | "available"
  | "channel"
  | "server"
  | "user";

export type ServerFeatureEnvironment = Readonly<Record<string, string | undefined>>;

export type ServerFeatureAccess =
  | { enabled: true; reason: "available" }
  | {
      enabled: false;
      reason: Exclude<ServerFeatureAccessReason, "available">;
    };

export class ProductFeatureUnavailableError extends Error {
  readonly feature: ProductFeature;
  readonly reason: Exclude<ServerFeatureAccessReason, "available">;

  constructor(
    feature: ProductFeature,
    reason: Exclude<ServerFeatureAccessReason, "available">,
  ) {
    super("Функция пока недоступна");
    this.name = "ProductFeatureUnavailableError";
    this.feature = feature;
    this.reason = reason;
  }
}

function releaseChannel(value: string | undefined): ProductReleaseChannel {
  return value === "internal" || value === "beta" || value === "stable"
    ? value
    : "stable";
}

function csvSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function configuredCapabilities(value: string | undefined) {
  const configured = csvSet(value);
  return new Set<ProductFeature>(
    PRODUCT_FEATURES.filter((feature) => configured.has(feature)),
  );
}

export function resolveServerFeatureAccess(
  feature: ProductFeature,
  userId: string,
  environment: ServerFeatureEnvironment,
): ServerFeatureAccess {
  const channel = releaseChannel(environment.VOOPLE_RELEASE_CHANNEL);
  const availability = resolveFeatureAvailability(feature, {
    platform: "web",
    channel,
    serverCapabilities: configuredCapabilities(
      environment.VOOPLE_SERVER_CAPABILITIES,
    ),
  });

  if (!availability.enabled) {
    return {
      enabled: false,
      reason: availability.reason === "server" ? "server" : "channel",
    };
  }

  if (
    channel === "internal"
    && !csvSet(environment.VOOPLE_INTERNAL_USER_IDS).has(userId.toLowerCase())
  ) {
    return { enabled: false, reason: "user" };
  }

  return { enabled: true, reason: "available" };
}
