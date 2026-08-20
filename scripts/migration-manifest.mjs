export const REQUIRED_MIGRATIONS = Object.freeze([
  "38-group-emojis.sql",
  "39-structured-chat-content.sql",
  "43-group-sounds.sql",
  "45-app-schema-migrations.sql",
  "46-legacy-emoji-backfill.sql",
  "47-message-reactions-replica-identity.sql",
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
]);
