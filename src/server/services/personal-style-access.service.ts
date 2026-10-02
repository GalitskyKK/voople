import "server-only";

import { getPersonalPlanStatus } from "@/server/services/personal-plan.service";
import { getSubscriptionRest, isSubscriptionActive } from "@/server/data/subscription-rest";
import type { PersonalStyleAccess } from "@/types/personal-style-access";

/** Two independent reads evaluated at one instant, not an atomic DB snapshot. */
export async function getPersonalStyleAccess(userId: string, evaluatedAt = new Date()): Promise<PersonalStyleAccess> {
  const timestamp = new Date(evaluatedAt.toISOString());
  const [legacy, plans] = await Promise.all([
    getSubscriptionRest(userId), getPersonalPlanStatus(userId, timestamp),
  ]);
  // Preserve legacy semantics: expires_at > now; started_at and tier are unconsulted.
  const activeLegacySubscription = isSubscriptionActive(legacy, timestamp);
  const activeStyleCoverage = plans.coverage.style;
  return {
    evaluatedAt: timestamp.toISOString(),
    policyVersion: "app-theme-legacy-or-style-v1",
    sources: { activeLegacySubscription, activeStyleCoverage },
    capabilities: {
      selectPaidAppTheme: activeLegacySubscription || activeStyleCoverage,
      selectPremiumNicknameFont: activeLegacySubscription || activeStyleCoverage,
      selectPremiumNicknameEffect: activeLegacySubscription || activeStyleCoverage,
    },
  };
}
