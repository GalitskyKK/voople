import { createHash } from "node:crypto";

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

export function normalizeMigrationSource(source) {
  return source.replace(/\r\n?/g, "\n");
}

/** Stable checksum independent of the contributor's Git line-ending mode. */
export function migrationChecksum(source) {
  return sha256(normalizeMigrationSource(source));
}

/** Accept checksums written by the pre-canonical Windows apply script. */
export function acceptedMigrationChecksums(source) {
  const normalized = normalizeMigrationSource(source);
  return new Set([
    sha256(normalized),
    sha256(normalized.replace(/\n/g, "\r\n")),
  ]);
}
