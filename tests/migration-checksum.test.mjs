import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  acceptedMigrationChecksums,
  migrationChecksum,
} from "../scripts/migration-checksum.mjs";

test("migration checksum is stable across LF and CRLF checkouts", () => {
  const lf = "create table example (id uuid);\ncomment on table example is 'ok';\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.equal(migrationChecksum(lf), migrationChecksum(crlf));
});

test("release readiness accepts checksums recorded before line-ending normalization", () => {
  const lf = "alter table example add column title text;\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  const legacyWindowsChecksum = createHash("sha256").update(crlf).digest("hex");
  assert.equal(acceptedMigrationChecksums(lf).has(legacyWindowsChecksum), true);
});
