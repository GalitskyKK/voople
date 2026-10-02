/** Reviewed personal Style capabilities; Full does not participate. */
export type PersonalStyleAccess = {
  evaluatedAt: string;
  policyVersion: "app-theme-legacy-or-style-v1";
  sources: { activeLegacySubscription: boolean; activeStyleCoverage: boolean };
  capabilities: { selectCustomNicknameColor: boolean; selectPaidAppTheme: boolean; selectPremiumNicknameFont: boolean; selectPremiumNicknameEffect: boolean };
};

export type NicknameFontAccess = { evaluatedAt: Date; activeStyleCoverage: boolean };
