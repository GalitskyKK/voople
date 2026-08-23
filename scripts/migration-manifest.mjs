export const REQUIRED_MIGRATIONS = Object.freeze([
  "38-group-emojis.sql",
  "39-structured-chat-content.sql",
  "43-group-sounds.sql",
  "45-app-schema-migrations.sql",
  "46-legacy-emoji-backfill.sql",
  "47-message-reactions-replica-identity.sql",
  "48-group-baseline-identity.sql",
  "49-client-product-analytics.sql",
  "50-trusted-login-devices.sql",
  "51-group-perk-allocations.sql",
  "52-group-discovery-access.sql",
  "53-interests-topics.sql",
  "54-presence-privacy.sql",
  "55-contact-pins.sql",
  "56-user-group-profile-tag.sql",
]);

// The ledger must exist before the feature migrations are replayed so every
// successful application receives a real checksum, including legacy installs.
export const RELEASE_APPLY_ORDER = Object.freeze([
  "45-app-schema-migrations.sql",
  "38-group-emojis.sql",
  "39-structured-chat-content.sql",
  "43-group-sounds.sql",
  "46-legacy-emoji-backfill.sql",
  "47-message-reactions-replica-identity.sql",
  "48-group-baseline-identity.sql",
  "49-client-product-analytics.sql",
  "50-trusted-login-devices.sql",
  "51-group-perk-allocations.sql",
  "52-group-discovery-access.sql",
  "53-interests-topics.sql",
  "54-presence-privacy.sql",
  "55-contact-pins.sql",
  "56-user-group-profile-tag.sql",
]);
