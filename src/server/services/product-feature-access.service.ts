import "server-only";

import type { ProductFeature } from "@/lib/product/feature-availability";
import {
  ProductFeatureUnavailableError,
  resolveServerFeatureAccess,
} from "@/lib/product/server-feature-access";

export { ProductFeatureUnavailableError } from "@/lib/product/server-feature-access";

export function getServerFeatureAccess(
  feature: ProductFeature,
  userId: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return resolveServerFeatureAccess(feature, userId, environment);
}

export function assertServerFeatureAvailable(
  feature: ProductFeature,
  userId: string,
) {
  const access = getServerFeatureAccess(feature, userId);
  if (!access.enabled) {
    throw new ProductFeatureUnavailableError(feature, access.reason);
  }
}
