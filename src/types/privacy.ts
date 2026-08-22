export const PRIVACY_SCOPES = [
  "everyone",
  "contacts_and_groups",
  "contacts",
  "nobody",
] as const;

export type PrivacyScope = (typeof PRIVACY_SCOPES)[number];

export type UserPrivacySettingsView = {
  onlineScope: PrivacyScope;
  gamingScope: PrivacyScope;
  musicScope: PrivacyScope;
  roomsScope: PrivacyScope;
  inviteScope: PrivacyScope;
  connectionRequestScope: PrivacyScope;
  appearInRecommendations: boolean;
  showInterests: boolean;
};
