import "server-only";

import { resolveEffectiveAppThemeId } from "@/lib/app-themes";
import { getSavedAppThemeRest } from "@/server/data/app-theme-rest";
import { getPersonalStyleAccess } from "@/server/services/personal-style-access.service";
import type { AccountAppTheme } from "@/types/app-theme";

export async function getAccountAppTheme(userId: string, evaluatedAt = new Date()): Promise<AccountAppTheme> {
  const [savedAppThemeId, access] = await Promise.all([
    getSavedAppThemeRest(userId), getPersonalStyleAccess(userId, evaluatedAt),
  ]);
  return { savedAppThemeId, effectiveAppThemeId: resolveEffectiveAppThemeId(
    savedAppThemeId, access.capabilities.selectPaidAppTheme,
  ), access };
}
