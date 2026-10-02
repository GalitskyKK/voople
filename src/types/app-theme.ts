import type { AppThemeId } from "@/lib/app-themes";

export type PersonalStyleAccess = {
  evaluatedAt: string;
  policyVersion: "app-theme-legacy-or-style-v1";
  sources: { activeLegacySubscription: boolean; activeStyleCoverage: boolean };
  capabilities: { selectPaidAppTheme: boolean };
};

export type AccountAppTheme = {
  savedAppThemeId: string | null;
  effectiveAppThemeId: AppThemeId;
  access: PersonalStyleAccess;
};
